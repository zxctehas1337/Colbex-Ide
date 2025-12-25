use super::{OutlineSymbol, Range, SymbolKind};
use oxc::allocator::Allocator;
use oxc::ast::ast::*;
use oxc::ast_visit::{walk, Visit};
use oxc::parser::Parser;
use oxc::span::{GetSpan, SourceType, Span};
use std::fs;
use std::path::Path;

pub fn parse_outline(file_path: &str) -> Result<Vec<OutlineSymbol>, anyhow::Error> {
    let path = Path::new(file_path);
    let source = fs::read_to_string(path)?;
    parse_outline_from_content(file_path, &source)
}

pub fn parse_outline_from_content(file_path: &str, source: &str) -> Result<Vec<OutlineSymbol>, anyhow::Error> {
    let path = Path::new(file_path);
    let source_type = SourceType::from_path(path).unwrap_or_default();
    let allocator = Allocator::default();
    
    let parser = Parser::new(&allocator, source, source_type);
    let result = parser.parse();
    
    if result.panicked {
        return Err(anyhow::anyhow!("Parser panicked"));
    }
    
    let mut visitor = OutlineVisitor::new(source);
    visitor.visit_program(&result.program);
    
    Ok(visitor.symbols)
}

struct OutlineVisitor<'a> {
    source: &'a str,
    symbols: Vec<OutlineSymbol>,
    // Stack for nested symbols (classes, objects)
    stack: Vec<Vec<OutlineSymbol>>,
}

impl<'a> OutlineVisitor<'a> {
    fn new(source: &'a str) -> Self {
        Self {
            source,
            symbols: Vec::new(),
            stack: Vec::new(),
        }
    }
    
    fn span_to_range(&self, span: Span) -> Range {
        let start = span.start as usize;
        let end = span.end as usize;
        
        let (start_line, start_col) = self.offset_to_line_col(start);
        let (end_line, end_col) = self.offset_to_line_col(end);
        
        Range {
            start_line,
            start_column: start_col,
            end_line,
            end_column: end_col,
        }
    }
    
    fn offset_to_line_col(&self, offset: usize) -> (u32, u32) {
        let mut line = 1u32;
        let mut col = 1u32;
        
        for (i, ch) in self.source.char_indices() {
            if i >= offset {
                break;
            }
            if ch == '\n' {
                line += 1;
                col = 1;
            } else {
                col += 1;
            }
        }
        
        (line, col)
    }
    
    fn push_symbol(&mut self, symbol: OutlineSymbol) {
        if let Some(parent_children) = self.stack.last_mut() {
            parent_children.push(symbol);
        } else {
            self.symbols.push(symbol);
        }
    }
    
    fn start_scope(&mut self) {
        self.stack.push(Vec::new());
    }
    
    fn end_scope(&mut self) -> Vec<OutlineSymbol> {
        self.stack.pop().unwrap_or_default()
    }
}

impl<'a> Visit<'a> for OutlineVisitor<'a> {
    fn visit_function(&mut self, func: &Function<'a>, _flags: oxc::semantic::ScopeFlags) {
        if let Some(id) = &func.id {
            let symbol = OutlineSymbol {
                name: id.name.to_string(),
                kind: SymbolKind::Function,
                detail: self.get_function_detail(func),
                range: self.span_to_range(func.span),
                selection_range: self.span_to_range(id.span),
                children: None,
            };
            self.push_symbol(symbol);
        }
        
        // Visit function body for nested declarations
        walk::walk_function(self, func, _flags);
    }
    
    fn visit_class(&mut self, class: &Class<'a>) {
        if let Some(id) = &class.id {
            self.start_scope();
            
            // Visit class body
            walk::walk_class(self, class);
            
            let children = self.end_scope();
            
            let symbol = OutlineSymbol {
                name: id.name.to_string(),
                kind: SymbolKind::Class,
                detail: None,
                range: self.span_to_range(class.span),
                selection_range: self.span_to_range(id.span),
                children: if children.is_empty() { None } else { Some(children) },
            };
            self.push_symbol(symbol);
        } else {
            walk::walk_class(self, class);
        }
    }
    
    fn visit_method_definition(&mut self, method: &MethodDefinition<'a>) {
        let name = self.get_property_key_name(&method.key);
        if let Some(name) = name {
            let kind = match method.kind {
                MethodDefinitionKind::Constructor => SymbolKind::Constructor,
                MethodDefinitionKind::Get => SymbolKind::Property,
                MethodDefinitionKind::Set => SymbolKind::Property,
                _ => SymbolKind::Method,
            };
            
            let symbol = OutlineSymbol {
                name,
                kind,
                detail: self.get_method_detail(method),
                range: self.span_to_range(method.span),
                selection_range: self.span_to_range(method.key.span()),
                children: None,
            };
            self.push_symbol(symbol);
        }
        
        walk::walk_method_definition(self, method);
    }
    
    fn visit_property_definition(&mut self, prop: &PropertyDefinition<'a>) {
        let name = self.get_property_key_name(&prop.key);
        if let Some(name) = name {
            let symbol = OutlineSymbol {
                name,
                kind: if prop.r#static { SymbolKind::Constant } else { SymbolKind::Field },
                detail: None,
                range: self.span_to_range(prop.span),
                selection_range: self.span_to_range(prop.key.span()),
                children: None,
            };
            self.push_symbol(symbol);
        }
        
        walk::walk_property_definition(self, prop);
    }
    
    fn visit_variable_declaration(&mut self, decl: &VariableDeclaration<'a>) {
        let is_const = decl.kind == VariableDeclarationKind::Const;
        
        for declarator in &decl.declarations {
            self.visit_variable_declarator(declarator, is_const);
        }
    }
    
    fn visit_ts_interface_declaration(&mut self, iface: &TSInterfaceDeclaration<'a>) {
        self.start_scope();
        
        // Visit interface body
        for sig in &iface.body.body {
            self.visit_ts_signature(sig);
        }
        
        let children = self.end_scope();
        
        let symbol = OutlineSymbol {
            name: iface.id.name.to_string(),
            kind: SymbolKind::Interface,
            detail: None,
            range: self.span_to_range(iface.span),
            selection_range: self.span_to_range(iface.id.span),
            children: if children.is_empty() { None } else { Some(children) },
        };
        self.push_symbol(symbol);
    }
    
    fn visit_ts_type_alias_declaration(&mut self, alias: &TSTypeAliasDeclaration<'a>) {
        let symbol = OutlineSymbol {
            name: alias.id.name.to_string(),
            kind: SymbolKind::TypeParameter,
            detail: None,
            range: self.span_to_range(alias.span),
            selection_range: self.span_to_range(alias.id.span),
            children: None,
        };
        self.push_symbol(symbol);
        
        walk::walk_ts_type_alias_declaration(self, alias);
    }
    
    fn visit_ts_enum_declaration(&mut self, enum_decl: &TSEnumDeclaration<'a>) {
        self.start_scope();
        
        for member in &enum_decl.body.members {
            let name = match &member.id {
                TSEnumMemberName::Identifier(id) => id.name.to_string(),
                TSEnumMemberName::String(s) => s.value.to_string(),
                _ => continue, // Skip computed names
            };
            
            let symbol = OutlineSymbol {
                name,
                kind: SymbolKind::EnumMember,
                detail: None,
                range: self.span_to_range(member.span),
                selection_range: self.span_to_range(member.id.span()),
                children: None,
            };
            self.push_symbol(symbol);
        }
        
        let children = self.end_scope();
        
        let symbol = OutlineSymbol {
            name: enum_decl.id.name.to_string(),
            kind: SymbolKind::Enum,
            detail: None,
            range: self.span_to_range(enum_decl.span),
            selection_range: self.span_to_range(enum_decl.id.span),
            children: if children.is_empty() { None } else { Some(children) },
        };
        self.push_symbol(symbol);
    }
}

impl<'a> OutlineVisitor<'a> {
    fn visit_variable_declarator(&mut self, decl: &VariableDeclarator<'a>, is_const: bool) {
        match &decl.id.kind {
            BindingPatternKind::BindingIdentifier(id) => {
                // Check if it's an arrow function or function expression
                let (kind, detail, children) = if let Some(init) = &decl.init {
                    match init {
                        Expression::ArrowFunctionExpression(arrow) => {
                            (SymbolKind::Function, self.get_arrow_detail(arrow), None)
                        }
                        Expression::FunctionExpression(func) => {
                            (SymbolKind::Function, self.get_function_detail(func), None)
                        }
                        Expression::ObjectExpression(obj) => {
                            let children = self.extract_object_properties(obj);
                            (SymbolKind::Object, None, children)
                        }
                        _ => {
                            let kind = if is_const { SymbolKind::Constant } else { SymbolKind::Variable };
                            (kind, None, None)
                        }
                    }
                } else {
                    let kind = if is_const { SymbolKind::Constant } else { SymbolKind::Variable };
                    (kind, None, None)
                };
                
                let symbol = OutlineSymbol {
                    name: id.name.to_string(),
                    kind,
                    detail,
                    range: self.span_to_range(decl.span),
                    selection_range: self.span_to_range(id.span),
                    children,
                };
                self.push_symbol(symbol);
            }
            BindingPatternKind::ObjectPattern(obj) => {
                // Destructuring - create symbols for each property
                for prop in &obj.properties {
                    if let BindingPatternKind::BindingIdentifier(id) = &prop.value.kind {
                        let symbol = OutlineSymbol {
                            name: id.name.to_string(),
                            kind: if is_const { SymbolKind::Constant } else { SymbolKind::Variable },
                            detail: None,
                            range: self.span_to_range(prop.span),
                            selection_range: self.span_to_range(id.span),
                            children: None,
                        };
                        self.push_symbol(symbol);
                    }
                }
            }
            _ => {}
        }
    }
    
    fn visit_ts_signature(&mut self, sig: &TSSignature<'a>) {
        match sig {
            TSSignature::TSPropertySignature(prop) => {
                let name = self.get_property_key_name(&prop.key);
                if let Some(name) = name {
                    let symbol = OutlineSymbol {
                        name,
                        kind: SymbolKind::Property,
                        detail: None,
                        range: self.span_to_range(prop.span),
                        selection_range: self.span_to_range(prop.key.span()),
                        children: None,
                    };
                    self.push_symbol(symbol);
                }
            }
            TSSignature::TSMethodSignature(method) => {
                let name = self.get_property_key_name(&method.key);
                if let Some(name) = name {
                    let symbol = OutlineSymbol {
                        name,
                        kind: SymbolKind::Method,
                        detail: None,
                        range: self.span_to_range(method.span),
                        selection_range: self.span_to_range(method.key.span()),
                        children: None,
                    };
                    self.push_symbol(symbol);
                }
            }
            _ => {}
        }
    }
    
    fn get_property_key_name(&self, key: &PropertyKey<'a>) -> Option<String> {
        match key {
            PropertyKey::StaticIdentifier(id) => Some(id.name.to_string()),
            PropertyKey::PrivateIdentifier(id) => Some(format!("#{}", id.name)),
            PropertyKey::StringLiteral(s) => Some(s.value.to_string()),
            PropertyKey::NumericLiteral(n) => Some(n.value.to_string()),
            _ => None,
        }
    }
    
    fn get_function_detail(&self, func: &Function<'a>) -> Option<String> {
        let params: Vec<String> = func.params.items.iter()
            .filter_map(|p| self.get_param_name(&p.pattern))
            .collect();
        Some(format!("({})", params.join(", ")))
    }
    
    fn get_arrow_detail(&self, arrow: &ArrowFunctionExpression<'a>) -> Option<String> {
        let params: Vec<String> = arrow.params.items.iter()
            .filter_map(|p| self.get_param_name(&p.pattern))
            .collect();
        Some(format!("({})", params.join(", ")))
    }
    
    fn get_method_detail(&self, method: &MethodDefinition<'a>) -> Option<String> {
        let params: Vec<String> = method.value.params.items.iter()
            .filter_map(|p| self.get_param_name(&p.pattern))
            .collect();
        Some(format!("({})", params.join(", ")))
    }
    
    fn get_param_name(&self, pattern: &BindingPattern<'a>) -> Option<String> {
        match &pattern.kind {
            BindingPatternKind::BindingIdentifier(id) => Some(id.name.to_string()),
            BindingPatternKind::ObjectPattern(_) => Some("{}".to_string()),
            BindingPatternKind::ArrayPattern(_) => Some("[]".to_string()),
            BindingPatternKind::AssignmentPattern(assign) => {
                self.get_param_name(&assign.left)
            }
        }
    }
    
    fn extract_object_properties(&self, obj: &ObjectExpression<'a>) -> Option<Vec<OutlineSymbol>> {
        let mut children = Vec::new();
        
        for prop in &obj.properties {
            match prop {
                ObjectPropertyKind::ObjectProperty(p) => {
                    let name = self.get_property_key_name(&p.key);
                    if let Some(name) = name {
                        let (kind, detail) = match &p.value {
                            Expression::ArrowFunctionExpression(arrow) => {
                                (SymbolKind::Method, self.get_arrow_detail(arrow))
                            }
                            Expression::FunctionExpression(func) => {
                                (SymbolKind::Method, self.get_function_detail(func))
                            }
                            _ => (SymbolKind::Property, None),
                        };
                        
                        children.push(OutlineSymbol {
                            name,
                            kind,
                            detail,
                            range: self.span_to_range(p.span),
                            selection_range: self.span_to_range(p.key.span()),
                            children: None,
                        });
                    }
                }
                ObjectPropertyKind::SpreadProperty(_) => {}
            }
        }
        
        if children.is_empty() { None } else { Some(children) }
    }
}

import panelStyles from './panel.module.css';
import headerStyles from './header.module.css';
import dropdownStyles from './dropdown.module.css';
import terminalStyles from './terminal.module.css';
import sidebarStyles from './sidebar.module.css';
import problemsStyles from './problems.module.css';

// Объединяем все стили в один объект для обратной совместимости
const styles = {
  ...panelStyles,
  ...headerStyles,
  ...dropdownStyles,
  ...terminalStyles,
  ...sidebarStyles,
  ...problemsStyles,
};

export default styles;

// Экспортируем отдельные модули для точечного использования
export {
  panelStyles,
  headerStyles,
  dropdownStyles,
  terminalStyles,
  sidebarStyles,
  problemsStyles,
};

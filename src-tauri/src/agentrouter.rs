use serde::{Deserialize, Serialize};
use reqwest::Client;
use std::time::Duration;
use thiserror::Error;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::{State, Window, Emitter};
use futures_util::StreamExt;

#[derive(Error, Debug)]
pub enum AgentRouterError {
    #[error("HTTP request failed: {0}")]
    RequestError(#[from] reqwest::Error),
    #[error("Invalid response format: {0}")]
    InvalidResponse(String),
    #[error("API error: {0}")]
    ApiError(String),
    #[error("Stream error: {0}")]
    StreamError(String),
    #[error("Missing API key")]
    MissingApiKey,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRouterMessage {
    pub role: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRouterChatRequest {
    pub model: String,
    pub messages: Vec<AgentRouterMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stop: Option<StringOrArray>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<AgentRouterTool>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<AgentRouterToolChoice>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_format: Option<AgentRouterResponseFormat>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum StringOrArray {
    String(String),
    Array(Vec<String>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRouterTool {
    pub r#type: String,
    pub function: AgentRouterFunction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRouterFunction {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub parameters: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum AgentRouterToolChoice {
    String(String),
    Object { r#type: String, function: AgentRouterFunctionName },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRouterFunctionName {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRouterResponseFormat {
    pub r#type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRouterChatResponse {
    pub id: String,
    pub object: String,
    pub created: u64,
    pub model: String,
    pub choices: Vec<AgentRouterChoice>,
    pub usage: AgentRouterUsage,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRouterChoice {
    pub index: u32,
    pub message: AgentRouterMessage,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRouterUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AgentRouterStreamResponse {
    pub id: String,
    pub object: String,
    pub created: u64,
    pub model: String,
    pub choices: Vec<AgentRouterStreamChoice>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AgentRouterStreamChoice {
    pub index: u32,
    pub delta: AgentRouterStreamDelta,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AgentRouterStreamDelta {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRouterModel {
    pub id: String,
    pub object: String,
    pub created: u64,
    pub owned_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRouterModelsResponse {
    pub object: String,
    pub data: Vec<AgentRouterModel>,
}

pub struct AgentRouterClient {
    client: Client,
    base_url: String,
    api_key: String,
}

impl AgentRouterClient {
    pub fn new(api_key: String, base_url: Option<String>) -> Self {
        let base_url = base_url.unwrap_or_else(|| "https://agentrouter.org/v1".to_string());
        
        let client = Client::builder()
            .timeout(Duration::from_secs(300))
            .build()
            .expect("Failed to create HTTP client");

        Self { client, base_url, api_key }
    }

    pub async fn chat(&self, request: AgentRouterChatRequest) -> Result<AgentRouterChatResponse, AgentRouterError> {
        if self.api_key.is_empty() {
            return Err(AgentRouterError::MissingApiKey);
        }

        let url = format!("{}/chat/completions", self.base_url);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(AgentRouterError::ApiError(error_text));
        }

        let chat_response: AgentRouterChatResponse = response.json().await
            .map_err(|e| AgentRouterError::InvalidResponse(e.to_string()))?;

        Ok(chat_response)
    }

    pub async fn chat_stream_request(&self, request: AgentRouterChatRequest) -> Result<reqwest::Response, AgentRouterError> {
        if self.api_key.is_empty() {
            return Err(AgentRouterError::MissingApiKey);
        }

        let url = format!("{}/chat/completions", self.base_url);
        
        let mut stream_request = request.clone();
        stream_request.stream = Some(true);
        
        let response = self.client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&stream_request)
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(AgentRouterError::ApiError(error_text));
        }

        Ok(response)
    }

    pub async fn list_models(&self) -> Result<AgentRouterModelsResponse, AgentRouterError> {
        if self.api_key.is_empty() {
            return Err(AgentRouterError::MissingApiKey);
        }

        let url = format!("{}/models", self.base_url);
        
        let response = self.client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            return Err(AgentRouterError::ApiError(error_text));
        }

        let models_response: AgentRouterModelsResponse = response.json().await
            .map_err(|e| AgentRouterError::InvalidResponse(e.to_string()))?;

        Ok(models_response)
    }
}

pub struct AgentRouterState {
    pub client: Arc<Mutex<Option<AgentRouterClient>>>,
}

impl Default for AgentRouterState {
    fn default() -> Self {
        Self {
            client: Arc::new(Mutex::new(None)),
        }
    }
}

#[tauri::command]
pub async fn agentrouter_configure(
    api_key: String,
    base_url: Option<String>,
    state: State<'_, AgentRouterState>
) -> Result<(), String> {
    let mut client_guard = state.client.lock().await;
    *client_guard = Some(AgentRouterClient::new(api_key, base_url));
    Ok(())
}

#[tauri::command]
pub async fn agentrouter_chat(
    model: String,
    messages: Vec<AgentRouterMessage>,
    max_tokens: Option<u32>,
    temperature: Option<f32>,
    top_p: Option<f32>,
    state: State<'_, AgentRouterState>
) -> Result<AgentRouterChatResponse, String> {
    let client_guard = state.client.lock().await;
    let client = client_guard.as_ref().ok_or("AgentRouter not configured")?;
    
    let request = AgentRouterChatRequest {
        model,
        messages,
        stream: None,
        max_tokens,
        temperature,
        top_p,
        stop: None,
        tools: None,
        tool_choice: None,
        response_format: None,
    };
    
    match client.chat(request).await {
        Ok(response) => Ok(response),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn agentrouter_chat_stream(
    window: Window,
    model: String,
    messages: Vec<AgentRouterMessage>,
    max_tokens: Option<u32>,
    temperature: Option<f32>,
    top_p: Option<f32>,
    state: State<'_, AgentRouterState>
) -> Result<String, String> {
    let client_guard = state.client.lock().await;
    let client = client_guard.as_ref().ok_or("AgentRouter not configured")?;
    
    let request = AgentRouterChatRequest {
        model,
        messages,
        stream: Some(true),
        max_tokens,
        temperature,
        top_p,
        stop: None,
        tools: None,
        tool_choice: None,
        response_format: None,
    };
    
    let response = client.chat_stream_request(request)
        .await
        .map_err(|e| e.to_string())?;
    
    let mut stream = response.bytes_stream();
    let mut full_response = String::new();
    let mut buffer = String::new();

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| e.to_string())?;
        let chunk_str = String::from_utf8_lossy(&chunk);
        buffer.push_str(&chunk_str);

        // Process Server-Sent Events
        while let Some(pos) = buffer.find('\n') {
            let line_str = buffer.drain(..=pos).collect::<String>();
            let line = line_str.trim();
            
            if line.is_empty() || line.starts_with("data: [DONE]") {
                continue;
            }

            if line.starts_with("data: ") {
                let json_str = line.strip_prefix("data: ").unwrap_or(line);
                
                match serde_json::from_str::<AgentRouterStreamResponse>(json_str) {
                    Ok(stream_res) => {
                        if let Some(choice) = stream_res.choices.first() {
                            if let Some(content) = &choice.delta.content {
                                if !content.is_empty() {
                                    // Emit the chunk content to the frontend
                                    if let Err(e) = window.emit("agentrouter-stream", content) {
                                        println!("Failed to emit event: {}", e);
                                    }
                                    full_response.push_str(content);
                                }
                            }
                        }
                    },
                    Err(e) => {
                        println!("Failed to parse stream line: {} - Error: {}", json_str, e);
                    }
                }
            }
        }
    }
    
    Ok(full_response)
}

#[tauri::command]
pub async fn agentrouter_list_models(
    state: State<'_, AgentRouterState>
) -> Result<AgentRouterModelsResponse, String> {
    let client_guard = state.client.lock().await;
    let client = client_guard.as_ref().ok_or("AgentRouter not configured")?;
    
    client.list_models().await.map_err(|e| e.to_string())
}

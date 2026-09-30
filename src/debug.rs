use serde::Deserialize;
use std::collections::HashMap;
use zed::serde_json::{self, json, Value};
use zed_extension_api::{self as zed, Result};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LaunchConfig {
    program: String,
    cwd: Option<String>,
    runtime_path: Option<String>,
    #[serde(default)]
    args: Vec<String>,
    #[serde(default)]
    env: HashMap<String, String>,
    #[serde(default)]
    relaxed: bool,
}

pub fn request_kind(config: &Value) -> Result<zed::StartDebuggingRequestArgumentsRequest> {
    match config.get("request").and_then(Value::as_str) {
        Some("launch") => Ok(zed::StartDebuggingRequestArgumentsRequest::Launch),
        _ => Err("L^ supports only debug configurations with request = launch.".into()),
    }
}

pub fn binary(
    task: zed::DebugTaskDefinition,
    adapter_path: Option<String>,
    worktree: &zed::Worktree,
) -> Result<zed::DebugAdapterBinary> {
    let value: Value = serde_json::from_str(&task.config).map_err(|error| error.to_string())?;
    let request = request_kind(&value)?;
    let config: LaunchConfig = serde_json::from_value(value)
        .map_err(|error| format!("Invalid L^ debug config: {error}"))?;
    if config.program.trim().is_empty() {
        return Err("L^ debug configuration requires a non-empty program path.".into());
    }
    let command = adapter_path
        .or(config.runtime_path)
        .filter(|path| !path.trim().is_empty())
        .or_else(|| worktree.which("lhat"))
        .ok_or(
            "lhat was not found. Install it on PATH or set runtimePath in the debug configuration.",
        )?;

    // lhat owns the adapter and listens on loopback. Zed allocates a port and
    // retries the TCP connection while the runtime checks the program.
    let mut template = task.tcp_connection.unwrap_or(zed::TcpArgumentsTemplate {
        port: None,
        host: None,
        timeout: Some(30000),
    });
    template.host = Some(u32::from_be_bytes([127, 0, 0, 1]));
    let connection = zed::resolve_tcp_template(template)?;
    let mut arguments = vec![format!("--dap={}", connection.port)];
    if config.relaxed {
        arguments.push("--relaxed".into());
    }
    arguments.push(config.program);
    arguments.extend(config.args);

    Ok(zed::DebugAdapterBinary {
        command: Some(command),
        arguments,
        envs: config.env.into_iter().collect(),
        cwd: config.cwd.or_else(|| Some(worktree.root_path())),
        connection: Some(connection),
        request_args: zed::StartDebuggingRequestArguments {
            configuration: task.config,
            request,
        },
    })
}

pub fn scenario(config: zed::DebugConfig) -> Result<zed::DebugScenario> {
    let zed::DebugRequest::Launch(launch) = config.request else {
        return Err("L^ does not support attaching to an existing process.".into());
    };
    let mut value = json!({
        "request": "launch",
        "program": launch.program,
        "args": launch.args,
        "env": launch.envs.into_iter().collect::<HashMap<_, _>>(),
        "stopOnEntry": config.stop_on_entry.unwrap_or(false),
    });
    if let Some(cwd) = launch.cwd {
        value["cwd"] = json!(cwd);
    }
    Ok(zed::DebugScenario {
        label: config.label,
        adapter: config.adapter,
        build: None,
        config: value.to_string(),
        tcp_connection: None,
    })
}

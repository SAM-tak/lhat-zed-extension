use zed::settings::LspSettings;
use zed_extension_api::{self as zed, LanguageServerId, Result};

mod debug;

struct LhatExtension;

impl zed::Extension for LhatExtension {
    fn new() -> Self {
        Self
    }

    fn language_server_command(
        &mut self,
        language_server_id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        let settings = LspSettings::for_worktree(language_server_id.as_ref(), worktree)?;
        let binary = settings.binary.unwrap_or(zed::settings::CommandSettings {
            path: None,
            arguments: None,
            env: None,
        });
        let command = binary
            .path
            .filter(|path| !path.trim().is_empty())
            .or_else(|| worktree.which("lhatls"))
            .ok_or_else(|| {
                "lhatls was not found. Install it on PATH or set lsp.lhatls.binary.path in Zed settings."
                    .to_string()
            })?;

        Ok(zed::Command {
            command,
            args: binary.arguments.unwrap_or_default(),
            env: binary.env.unwrap_or_default().into_iter().collect(),
        })
    }

    fn language_server_initialization_options(
        &mut self,
        language_server_id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<Option<zed::serde_json::Value>> {
        Ok(
            LspSettings::for_worktree(language_server_id.as_ref(), worktree)?
                .initialization_options,
        )
    }

    fn language_server_workspace_configuration(
        &mut self,
        language_server_id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<Option<zed::serde_json::Value>> {
        Ok(LspSettings::for_worktree(language_server_id.as_ref(), worktree)?.settings)
    }

    fn get_dap_binary(
        &mut self,
        _adapter_name: String,
        config: zed::DebugTaskDefinition,
        user_provided_debug_adapter_path: Option<String>,
        worktree: &zed::Worktree,
    ) -> Result<zed::DebugAdapterBinary> {
        debug::binary(config, user_provided_debug_adapter_path, worktree)
    }

    fn dap_request_kind(
        &mut self,
        _adapter_name: String,
        config: zed::serde_json::Value,
    ) -> Result<zed::StartDebuggingRequestArgumentsRequest> {
        debug::request_kind(&config)
    }

    fn dap_config_to_scenario(&mut self, config: zed::DebugConfig) -> Result<zed::DebugScenario> {
        debug::scenario(config)
    }
}

zed::register_extension!(LhatExtension);

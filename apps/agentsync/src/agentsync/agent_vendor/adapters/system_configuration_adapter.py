import platform
from pathlib import Path

from agentsync.agent_vendor.models import AgentVendorConfiguration, AgentVendorName
from agentsync.agent_vendor.ports.configuration import VendorConfigurationNotFoundError


class UnsupportedPlatformError(Exception):
    pass


_PLATFORM_LINUX = "Linux"
_PLATFORM_DARWIN = "Darwin"
_PLATFORM_WINDOWS = "Windows"

_SKILLS = "skills"
_SUBAGENTS = "subagents"

_POSIX_CLAUDE_ROOT = Path.home() / ".claude"
_POSIX_CODEX_ROOT = Path.home() / ".codex"
_POSIX_GEMINI_ROOT = Path.home() / ".gemini"
_POSIX_CURSOR_ROOT = Path.home() / ".cursor"

_WINDOWS_ROOT = Path.home() / "AppData" / "Roaming"
_WINDOWS_CLAUDE_ROOT = _WINDOWS_ROOT / "Claude"
_WINDOWS_CODEX_ROOT = _WINDOWS_ROOT / "Codex"
_WINDOWS_GEMINI_ROOT = _WINDOWS_ROOT / "Gemini"
_WINDOWS_CURSOR_ROOT = _WINDOWS_ROOT / "Cursor"

_POSIX_CONFIGURATIONS: dict[AgentVendorName, AgentVendorConfiguration] = {
    AgentVendorName.CLAUDE_CODE: AgentVendorConfiguration(
        vendor_name=AgentVendorName.CLAUDE_CODE,
        package_name="claude",
        global_instruction_file_path=_POSIX_CLAUDE_ROOT / "CLAUDE.md",
        skills_directory_path=_POSIX_CLAUDE_ROOT / _SKILLS,
        subagents_directory_path=_POSIX_CLAUDE_ROOT / _SUBAGENTS,
    ),
    AgentVendorName.CODEX: AgentVendorConfiguration(
        vendor_name=AgentVendorName.CODEX,
        package_name="codex",
        global_instruction_file_path=_POSIX_CODEX_ROOT / "instructions.md",
        skills_directory_path=_POSIX_CODEX_ROOT / _SKILLS,
        subagents_directory_path=_POSIX_CODEX_ROOT / _SUBAGENTS,
    ),
    AgentVendorName.GEMINI_CLI: AgentVendorConfiguration(
        vendor_name=AgentVendorName.GEMINI_CLI,
        package_name="gemini",
        global_instruction_file_path=_POSIX_GEMINI_ROOT / "GEMINI.md",
        skills_directory_path=_POSIX_GEMINI_ROOT / _SKILLS,
        subagents_directory_path=_POSIX_GEMINI_ROOT / _SUBAGENTS,
    ),
    AgentVendorName.CURSOR_AGENT: AgentVendorConfiguration(
        vendor_name=AgentVendorName.CURSOR_AGENT,
        package_name="cursor",
        global_instruction_file_path=_POSIX_CURSOR_ROOT / "rules" / "global.mdc",
        skills_directory_path=_POSIX_CURSOR_ROOT / _SKILLS,
        subagents_directory_path=_POSIX_CURSOR_ROOT / _SUBAGENTS,
    ),
}

_WINDOWS_CONFIGURATIONS: dict[AgentVendorName, AgentVendorConfiguration] = {
    AgentVendorName.CLAUDE_CODE: AgentVendorConfiguration(
        vendor_name=AgentVendorName.CLAUDE_CODE,
        package_name="claude",
        global_instruction_file_path=_WINDOWS_CLAUDE_ROOT / "CLAUDE.md",
        skills_directory_path=_WINDOWS_CLAUDE_ROOT / _SKILLS,
        subagents_directory_path=_WINDOWS_CLAUDE_ROOT / _SUBAGENTS,
    ),
    AgentVendorName.CODEX: AgentVendorConfiguration(
        vendor_name=AgentVendorName.CODEX,
        package_name="codex",
        global_instruction_file_path=_WINDOWS_CODEX_ROOT / "instructions.md",
        skills_directory_path=_WINDOWS_CODEX_ROOT / _SKILLS,
        subagents_directory_path=_WINDOWS_CODEX_ROOT / _SUBAGENTS,
    ),
    AgentVendorName.GEMINI_CLI: AgentVendorConfiguration(
        vendor_name=AgentVendorName.GEMINI_CLI,
        package_name="gemini",
        global_instruction_file_path=_WINDOWS_GEMINI_ROOT / "GEMINI.md",
        skills_directory_path=_WINDOWS_GEMINI_ROOT / _SKILLS,
        subagents_directory_path=_WINDOWS_GEMINI_ROOT / _SUBAGENTS,
    ),
    AgentVendorName.CURSOR_AGENT: AgentVendorConfiguration(
        vendor_name=AgentVendorName.CURSOR_AGENT,
        package_name="cursor",
        global_instruction_file_path=_WINDOWS_CURSOR_ROOT / "rules" / "global.mdc",
        skills_directory_path=_WINDOWS_CURSOR_ROOT / _SKILLS,
        subagents_directory_path=_WINDOWS_CURSOR_ROOT / _SUBAGENTS,
    ),
}


def _platform_configurations() -> dict[AgentVendorName, AgentVendorConfiguration]:
    system = platform.system()
    if system in (_PLATFORM_LINUX, _PLATFORM_DARWIN):
        return _POSIX_CONFIGURATIONS
    if system == _PLATFORM_WINDOWS:
        return _WINDOWS_CONFIGURATIONS
    raise UnsupportedPlatformError(system)


def get_configuration(vendor_name: AgentVendorName) -> AgentVendorConfiguration:
    configurations = _platform_configurations()
    if vendor_name not in configurations:
        raise VendorConfigurationNotFoundError(vendor_name)
    return configurations[vendor_name]

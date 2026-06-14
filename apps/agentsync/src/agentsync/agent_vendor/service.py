import shutil

from agentsync.agent_vendor.models import AgentVendorName
from agentsync.agent_vendor.ports.configuration import ConfigurationPort


def is_installed(vendor_name: AgentVendorName, get_configuration: ConfigurationPort) -> bool:
    configuration = get_configuration(vendor_name)
    return shutil.which(configuration.package_name) is not None

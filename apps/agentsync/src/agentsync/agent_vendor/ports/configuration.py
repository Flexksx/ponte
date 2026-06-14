from collections.abc import Callable

from agentsync.agent_vendor.models import AgentVendorConfiguration, AgentVendorName


class VendorConfigurationNotFoundError(Exception):
    pass


ConfigurationPort = Callable[[AgentVendorName], AgentVendorConfiguration]

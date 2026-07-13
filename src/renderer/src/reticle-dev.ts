import { registerCapabilities } from '@reticlehq/react'

if (import.meta.env.DEV) {
  registerCapabilities({
    testids: [
      'DashboardTab',
      'InstanceList',
      'ConfigurationTab',
      'btn-start',
      'btn-stop',
      'input-server-name'
    ],
    signals: [
      'instance:create',
      'instance:delete',
      'instance:start',
      'instance:stop',
      'config:save',
      'file:save'
    ],
    stores: []
  })
}

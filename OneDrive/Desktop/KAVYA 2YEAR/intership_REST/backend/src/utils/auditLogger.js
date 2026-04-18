const { AuditLog } = require('../models');

const auditLogger = async ({ organizationId, userId, action, entityType, entityId, metadata = {}, ipAddress }) => {
  try {
    await AuditLog.create({
      organization_id: organizationId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata,
      ip_address: ipAddress,
    });
  } catch (err) {
    // Never let audit logging break the main flow
    console.error('Audit log error:', err.message);
  }
};

module.exports = auditLogger;

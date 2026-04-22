ALTER TABLE audit_events
  DROP CONSTRAINT IF EXISTS audit_events_action_type_check;

ALTER TABLE audit_events
  DROP CONSTRAINT IF EXISTS audit_events_entity_type_check;

ALTER TABLE audit_events
  ADD CONSTRAINT audit_events_action_type_check CHECK (
    action_type IN (
      'DRAFT_STANDARD_CREATED',
      'DRAFT_STANDARD_UPDATED',
      'VERSION_CREATED',
      'REVIEW_CYCLE_CREATED',
      'REVIEW_CYCLE_UPDATED',
      'REVIEW_CYCLE_ACTIVATED',
      'REVIEW_CYCLE_CLOSED',
      'REVIEW_ASSIGNMENT_CREATED',
      'COMMENT_CREATED',
      'COMMENT_UPDATED',
      'COMMENT_DELETED',
      'POSITION_SUBMITTED',
      'POSITION_UPDATED',
      'COMMENT_STATUS_CHANGED',
      'SECRETARIAT_RESPONSE_UPDATED',
      'FILE_UPLOADED',
      'FILE_METADATA_CHANGED',
      'FILE_DELETED'
    )
  );

ALTER TABLE audit_events
  ADD CONSTRAINT audit_events_entity_type_check CHECK (
    entity_type IN (
      'DRAFT_STANDARD',
      'DRAFT_STANDARD_VERSION',
      'REVIEW_CYCLE',
      'REVIEW_ASSIGNMENT',
      'REVIEW_COMMENT',
      'PARTICIPANT_POSITION',
      'VERSION_FILE'
    )
  );

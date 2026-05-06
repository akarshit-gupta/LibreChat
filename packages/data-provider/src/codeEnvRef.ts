/**
 * Typed reference to a file in the code-execution sandbox.
 *
 * Replaces the legacy magic-string `codeEnvIdentifier` /
 * `fileIdentifier` (`${session_id}/${file_id}?entity_id=...`) which was
 * parsed in three places and silently dropped fields. Records persist
 * both forms during the transition; reads prefer the structured field
 * and fall back to parsing the legacy string.
 *
 * `storage_session_id` is intentionally distinct from the *execution*
 * session id at the top level of an execute response — they are
 * different concepts that historically shared the field name
 * `session_id`. This is the long-lived storage session keyed by the
 * file's owner, not the transient sandbox-run session.
 */
export interface CodeEnvRef {
  storage_session_id: string;
  file_id: string;
  entity_id?: string;
}

/**
 * Parses the legacy magic string into a `CodeEnvRef`. Returns
 * `undefined` for inputs that don't match the expected shape. Empty
 * `entity_id` query values are treated as absent.
 */
export function parseCodeEnvIdentifier(
  identifier: string | null | undefined,
): CodeEnvRef | undefined {
  if (!identifier) return undefined;
  const [path, queryString] = identifier.split('?');
  const segments = path.split('/');
  /* Reject anything that isn't exactly `<storage_session_id>/<file_id>`
   * before the query string. Without the length check, `s/f/extra`
   * silently returns `{ storage_session_id: 's', file_id: 'f' }` and a
   * future change to the on-disk identifier shape would manifest as
   * wrong refs rather than a parse failure. */
  if (segments.length !== 2) return undefined;
  const [storage_session_id, file_id] = segments;
  if (!storage_session_id || !file_id) return undefined;
  let entity_id: string | undefined;
  if (queryString) {
    const value = new URLSearchParams(queryString).get('entity_id');
    if (value && value.length > 0) entity_id = value;
  }
  return entity_id ? { storage_session_id, file_id, entity_id } : { storage_session_id, file_id };
}

/**
 * Serializes a `CodeEnvRef` into the legacy magic string. Used during
 * dual-write so existing readers continue to work until the legacy
 * field is dropped.
 */
export function formatCodeEnvIdentifier(ref: CodeEnvRef): string {
  const base = `${ref.storage_session_id}/${ref.file_id}`;
  return ref.entity_id ? `${base}?entity_id=${ref.entity_id}` : base;
}

/**
 * Read a `CodeEnvRef` from a record that may carry either the
 * structured field, the legacy string, or both. Prefers the structured
 * field. Returns `undefined` when neither is usable.
 */
export function resolveCodeEnvRef(record: {
  codeEnvRef?: CodeEnvRef | null;
  codeEnvIdentifier?: string | null;
  fileIdentifier?: string | null;
}): CodeEnvRef | undefined {
  const ref = record.codeEnvRef;
  if (ref && ref.storage_session_id && ref.file_id) {
    return ref.entity_id
      ? {
          storage_session_id: ref.storage_session_id,
          file_id: ref.file_id,
          entity_id: ref.entity_id,
        }
      : { storage_session_id: ref.storage_session_id, file_id: ref.file_id };
  }
  return parseCodeEnvIdentifier(record.codeEnvIdentifier ?? record.fileIdentifier);
}

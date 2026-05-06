import { parseCodeEnvIdentifier, formatCodeEnvIdentifier, resolveCodeEnvRef } from './codeEnvRef';

describe('parseCodeEnvIdentifier', () => {
  it('parses session/file with entity_id query', () => {
    expect(parseCodeEnvIdentifier('s1/f1?entity_id=skill-42')).toEqual({
      storage_session_id: 's1',
      file_id: 'f1',
      entity_id: 'skill-42',
    });
  });

  it('parses session/file without query string', () => {
    expect(parseCodeEnvIdentifier('s1/f1')).toEqual({
      storage_session_id: 's1',
      file_id: 'f1',
    });
  });

  it('treats empty entity_id as absent', () => {
    expect(parseCodeEnvIdentifier('s1/f1?entity_id=')).toEqual({
      storage_session_id: 's1',
      file_id: 'f1',
    });
  });

  it('returns undefined for empty / null / missing slash', () => {
    expect(parseCodeEnvIdentifier('')).toBeUndefined();
    expect(parseCodeEnvIdentifier(null)).toBeUndefined();
    expect(parseCodeEnvIdentifier(undefined)).toBeUndefined();
    expect(parseCodeEnvIdentifier('no-slash-here')).toBeUndefined();
  });
});

describe('formatCodeEnvIdentifier', () => {
  it('round-trips through parse', () => {
    const ref = { storage_session_id: 's1', file_id: 'f1', entity_id: 'skill-42' };
    expect(parseCodeEnvIdentifier(formatCodeEnvIdentifier(ref))).toEqual(ref);
  });

  it('omits entity_id query when absent', () => {
    expect(formatCodeEnvIdentifier({ storage_session_id: 's1', file_id: 'f1' })).toBe('s1/f1');
  });
});

describe('resolveCodeEnvRef', () => {
  it('prefers structured codeEnvRef over legacy string', () => {
    const ref = { storage_session_id: 'new', file_id: 'new', entity_id: 'e' };
    expect(
      resolveCodeEnvRef({
        codeEnvRef: ref,
        codeEnvIdentifier: 'old/old?entity_id=stale',
      }),
    ).toEqual(ref);
  });

  it('falls back to codeEnvIdentifier when codeEnvRef is missing', () => {
    expect(resolveCodeEnvRef({ codeEnvIdentifier: 'sid/fid?entity_id=x' })).toEqual({
      storage_session_id: 'sid',
      file_id: 'fid',
      entity_id: 'x',
    });
  });

  it('falls back to fileIdentifier (File.metadata field name)', () => {
    expect(resolveCodeEnvRef({ fileIdentifier: 'sid/fid' })).toEqual({
      storage_session_id: 'sid',
      file_id: 'fid',
    });
  });

  it('returns undefined when nothing usable is set', () => {
    expect(resolveCodeEnvRef({})).toBeUndefined();
    expect(resolveCodeEnvRef({ codeEnvIdentifier: '' })).toBeUndefined();
    expect(
      resolveCodeEnvRef({
        codeEnvRef: { storage_session_id: '', file_id: 'f' } as never,
      }),
    ).toBeUndefined();
  });

  it('strips extra fields off the structured ref to keep the return clean', () => {
    const out = resolveCodeEnvRef({
      codeEnvRef: {
        storage_session_id: 's1',
        file_id: 'f1',
      } as never,
    });
    expect(out).toEqual({ storage_session_id: 's1', file_id: 'f1' });
    expect(out).not.toHaveProperty('entity_id');
  });
});

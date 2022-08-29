import { IBError, IBResFormats } from './IBDefinitions';

describe('IBDefinition E2E Test', () => {
  describe('Construction IBError', () => {
    it('Case: INVALIDPARAMS', () => {
      const eType = 'INVALIDPARAMS' as keyof IBResFormats;
      const ibError = new IBError({
        type: eType,
        message: 'eMessage',
      });
      expect(ibError.name).toBe('IBError');
      expect(ibError.type).toBe(eType);
      expect(ibError.message).toBe('eMessage');
    });
  });
});

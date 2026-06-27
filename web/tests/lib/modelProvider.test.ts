import { describe, it, expect } from 'vitest';
import { execProvider, execModel, buildExec, type ProviderId } from '../../lib/modelProvider';

describe('modelProvider', () => {
  describe('execProvider', () => {
    it('maps explicit prefixes to their provider', () => {
      expect(execProvider('codex:gpt-5.5')).toBe('codex');
      expect(execProvider('claude:opus')).toBe('claude-code');
      expect(execProvider('opencode:deepseek/x')).toBe('opencode');
      expect(execProvider('kilo:anthropic/claude-sonnet-4-5')).toBe('kilo');
      expect(execProvider('pi:sonnet')).toBe('pi');
      expect(execProvider('omp:opus')).toBe('omp');
    });
    it('keeps the bare-spec heuristic (slash → opencode, plain → claude)', () => {
      expect(execProvider('a/b')).toBe('opencode');
      expect(execProvider('sonnet')).toBe('claude-code');
    });
  });

  describe('execModel', () => {
    it('strips the provider prefix for the new CLIs', () => {
      expect(execModel('kilo:anthropic/claude-sonnet-4-5')).toBe('anthropic/claude-sonnet-4-5');
      expect(execModel('pi:sonnet')).toBe('sonnet');
      expect(execModel('omp:opus')).toBe('opus');
    });
  });

  describe('buildExec', () => {
    it('always prefixes the new (provider-agnostic) CLIs', () => {
      expect(buildExec('kilo', 'anthropic/claude-sonnet-4-5')).toBe('kilo:anthropic/claude-sonnet-4-5');
      expect(buildExec('pi', 'sonnet')).toBe('pi:sonnet');
      expect(buildExec('omp', 'opus')).toBe('omp:opus');
    });
    it('round-trips provider/model through build → parse for every new CLI', () => {
      for (const provider of ['kilo', 'pi', 'omp'] as ProviderId[]) {
        const exec = buildExec(provider, 'anthropic/claude-sonnet-4-5');
        expect(execProvider(exec)).toBe(provider);
        expect(execModel(exec)).toBe('anthropic/claude-sonnet-4-5');
      }
    });
  });
});

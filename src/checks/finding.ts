import type { MessageKey } from '../shared/i18n';
import type { Confidence, Finding, Severity } from '../shared/types';

// Builds a finding whose strings live under check.<id>.title|impact|fix (07_I18N.md).
export function makeFinding(
  id: string,
  severity: Severity,
  confidence: Confidence,
  evidence: string[],
  refs: Finding['refs'] = [],
): Finding {
  return {
    checkId: id,
    severity,
    confidence,
    titleKey: `check.${id}.title` as MessageKey,
    impactKey: `check.${id}.impact` as MessageKey,
    fixKey: `check.${id}.fix` as MessageKey,
    evidence,
    refs,
  };
}

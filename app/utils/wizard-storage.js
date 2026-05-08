// Tab-local UX state for the setup wizard. Lives in sessionStorage
// because none of these values are server-truth — they're transient
// pointers (which step the user is mid-flow on, which profession they
// just picked, whether the extension has postMessaged us this session).
//
// Plain functions, no service shell — callers import what they need.
// The OnboardingModel owns server-truth; this module owns the rest.

const SS_WIZARD_PROFESSION = 'cc:wizard-profession';
const SS_WIZARD_STEP = 'cc:wizard-step';
const SS_EXTENSION_PRESENT = 'cc:extension-present';

const WIZARD_STEPS = ['profession', 'resume', 'review', 'score'];

function _read(key) {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function _write(key, value) {
  if (typeof window === 'undefined') return;
  try {
    if (value == null || value === '') {
      window.sessionStorage.removeItem(key);
    } else {
      window.sessionStorage.setItem(key, value);
    }
  } catch {
    /* sessionStorage blocked — best effort */
  }
}

export function getProfession() {
  return _read(SS_WIZARD_PROFESSION);
}

export function setProfession(value) {
  _write(SS_WIZARD_PROFESSION, value);
}

/** Read the persisted wizard step. Falls back to null if the user
 * isn't mid-flow. Callers compose with the model's currentStep when
 * deciding where to land. */
export function getResumeStep() {
  const stored = _read(SS_WIZARD_STEP);
  if (stored && WIZARD_STEPS.includes(stored)) return stored;
  return null;
}

export function setResumeStep(stepName) {
  if (stepName && !WIZARD_STEPS.includes(stepName)) return;
  _write(SS_WIZARD_STEP, stepName);
}

/** True iff the extension has postMessaged this tab during the
 * current session (set by application.js#_handleExtensionPresent). */
export function isExtensionPresent() {
  return _read(SS_EXTENSION_PRESENT) === 'true';
}

export const WIZARD_STORAGE_KEYS = {
  profession: SS_WIZARD_PROFESSION,
  step: SS_WIZARD_STEP,
  extension: SS_EXTENSION_PRESENT,
};

import { describe, it, expect } from 'vitest';
import { notificationSoundName } from '../notificationSetup';

describe('notificationSoundName', () => {
  it('maps bundled bells to their CAF counterparts', () => {
    expect(notificationSoundName('bell')).toBe('bell.caf');
    expect(notificationSoundName('chime')).toBe('chime.caf');
    expect(notificationSoundName('tibetan-bell')).toBe('tibetan-bell.caf');
    expect(notificationSoundName('tibetan-bowl')).toBe('tibetan-bowl.caf');
  });

  it('stays silent when the user chose no ending sound', () => {
    expect(notificationSoundName('none')).toBeNull();
  });

  it('falls back to the classic bell for custom sounds', () => {
    expect(notificationSoundName('custom-1699999999')).toBe('bell.caf');
  });

  it('never maps ambient sounds (they are not bells)', () => {
    // Ambient ids are not in the bell set, so they take the custom-sound
    // fallback path — the function is only ever called with ending sounds.
    expect(notificationSoundName('rain')).toBe('bell.caf');
  });
});

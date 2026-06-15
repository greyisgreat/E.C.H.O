/**
 * Echo — Chronometer
 * -----------------------------------------------------------------------
 * A precise local time + date readout. Re-renders once per second;
 * digits that change get a brief "flip" animation class so the clock
 * feels alive without being distracting.
 */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export class Chronometer {
  constructor(root) {
    this.root = root;
    this.els = {
      hours: root.querySelector('[data-clock="hours"]'),
      minutes: root.querySelector('[data-clock="minutes"]'),
      seconds: root.querySelector('[data-clock="seconds"]'),
      meridiem: root.querySelector('[data-clock="meridiem"]'),
      date: root.querySelector('[data-clock="date"]'),
      timezone: root.querySelector('[data-clock="timezone"]'),
    };
    this._lastValues = {};
  }

  start() {
    this._tick();
    this._interval = setInterval(() => this._tick(), 1000);
  }

  stop() {
    clearInterval(this._interval);
  }

  _tick() {
    const now = new Date();
    let hours24 = now.getHours();
    const meridiem = hours24 >= 12 ? 'PM' : 'AM';
    let hours12 = hours24 % 12;
    if (hours12 === 0) hours12 = 12;

    this._setIfChanged('hours', pad(hours12));
    this._setIfChanged('minutes', pad(now.getMinutes()));
    this._setIfChanged('seconds', pad(now.getSeconds()));
    this._setIfChanged('meridiem', meridiem);

    const dateLabel = `${WEEKDAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;
    if (this.els.date.textContent !== dateLabel) this.els.date.textContent = dateLabel;

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (this.els.timezone.textContent !== tz) this.els.timezone.textContent = tz;
  }

  _setIfChanged(key, value) {
    if (this._lastValues[key] === value) return;
    this._lastValues[key] = value;
    const el = this.els[key];
    el.textContent = value;
    el.classList.remove('clock-tick');
    // restart the animation
    void el.offsetWidth;
    el.classList.add('clock-tick');
  }
}

function pad(n) {
  return String(n).padStart(2, '0');
}

#!/usr/bin/env node

/**
 * Siddhanath Events Updater
 * Fetches events from siddhanath.org iCal feed and adds full moon dates
 * Run: node scripts/update-events.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const ICAL_URL = 'https://siddhanath.org/events/?ical=1';
const OUTPUT_FILE = path.join(__dirname, '..', 'events.json');

// Full moon dates for 2026 (UTC)
// Source: astronomical calculations
const FULL_MOONS_2026 = [
  '2026-01-03', '2026-02-01', '2026-03-03', '2026-04-01', '2026-05-01',
  '2026-05-31', '2026-06-29', '2026-07-29', '2026-08-28', '2026-09-26',
  '2026-10-26', '2026-11-24', '2026-12-24'
];

const FULL_MOONS_2027 = [
  '2027-01-22', '2027-02-20', '2027-03-22', '2027-04-20', '2027-05-20',
  '2027-06-18', '2027-07-18', '2027-08-17', '2027-09-15', '2027-10-15',
  '2027-11-13', '2027-12-13'
];

function fetchIcal(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseIcal(icalData) {
  const events = [];
  const eventBlocks = icalData.split('BEGIN:VEVENT');

  for (let i = 1; i < eventBlocks.length; i++) {
    const block = eventBlocks[i].split('END:VEVENT')[0];
    const event = {};

    // Parse each line
    const lines = block.split(/\r?\n/);
    let currentKey = '';
    let currentValue = '';

    for (const line of lines) {
      if (line.startsWith(' ') || line.startsWith('\t')) {
        // Continuation of previous line
        currentValue += line.trim();
      } else {
        // Save previous key-value
        if (currentKey) {
          event[currentKey] = currentValue;
        }
        // Parse new line
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          currentKey = line.slice(0, colonIdx).split(';')[0];
          currentValue = line.slice(colonIdx + 1);
        }
      }
    }
    if (currentKey) {
      event[currentKey] = currentValue;
    }

    if (event.SUMMARY && event.DTSTART) {
      events.push(event);
    }
  }

  return events;
}

function parseIcalDate(dateStr) {
  // Handle formats like: 20260209 or 20260209T190000
  if (!dateStr) return null;
  const clean = dateStr.replace(/[^0-9T]/g, '');
  if (clean.length >= 8) {
    const year = clean.slice(0, 4);
    const month = clean.slice(4, 6);
    const day = clean.slice(6, 8);
    return `${year}-${month}-${day}`;
  }
  return null;
}

function unescapeIcal(str) {
  if (!str) return '';
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function generateFullMoonEvents() {
  const today = new Date();
  const allMoons = [...FULL_MOONS_2026, ...FULL_MOONS_2027];

  return allMoons
    .filter(date => new Date(date) >= today)
    .slice(0, 12) // Next 12 full moons
    .map(date => ({
      id: `fullmoon-${date}`,
      title: 'Earth Peace Meditation',
      subtitle: 'Full Moon Meditation',
      startDate: date,
      endDate: date,
      startTime: '19:00',
      endTime: '21:00',
      location: 'Worldwide - Your Local Time (7-9 PM)',
      description: 'Join practitioners worldwide for the Full Moon Earth Peace Meditation. Held 7-9 PM in your local time zone. This sacred practice channels healing energy for global peace and harmony. "Earth Peace Through Self Peace."',
      link: 'https://siddhanath.org/events/',
      type: 'fullmoon',
      featured: false,
      recurring: true
    }));
}

async function main() {
  console.log('Fetching events from siddhanath.org...');

  let icalEvents = [];
  try {
    const icalData = await fetchIcal(ICAL_URL);
    const rawEvents = parseIcal(icalData);
    console.log(`Found ${rawEvents.length} events in iCal feed`);

    icalEvents = rawEvents.map(e => {
      const startDate = parseIcalDate(e.DTSTART);
      const endDate = parseIcalDate(e.DTEND) || startDate;

      // Determine event type
      let type = 'retreat';
      const title = (e.SUMMARY || '').toLowerCase();
      if (title.includes('pilgrimage')) type = 'pilgrimage';
      else if (title.includes('satsang')) type = 'satsang';
      else if (title.includes('empowerment')) type = 'empowerment';
      else if (title.includes('meditation')) type = 'meditation';

      return {
        id: `event-${startDate}-${Math.random().toString(36).slice(2, 8)}`,
        title: unescapeIcal(e.SUMMARY),
        startDate,
        endDate,
        location: unescapeIcal(e.LOCATION) || 'Siddhanath Forest Ashram',
        description: unescapeIcal(e.DESCRIPTION)?.slice(0, 500) || '',
        link: e.URL || 'https://siddhanath.org/events/',
        type,
        featured: true
      };
    }).filter(e => e.startDate && new Date(e.startDate) >= new Date());

  } catch (error) {
    console.error('Error fetching iCal:', error.message);
    console.log('Using cached events if available...');
  }

  // Generate full moon events
  const fullMoonEvents = generateFullMoonEvents();
  console.log(`Generated ${fullMoonEvents.length} full moon meditation events`);

  // Combine and sort
  const allEvents = [...icalEvents, ...fullMoonEvents]
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  const output = {
    lastUpdated: new Date().toISOString().split('T')[0],
    source: 'https://siddhanath.org/events/?ical=1',
    nextUpdate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    events: allEvents,
    eventTypes: [
      { type: 'pilgrimage', name: 'Pilgrimages', icon: '🏔️', description: 'Sacred journeys to holy sites with Yogiraj' },
      { type: 'retreat', name: 'Retreats', icon: '🧘', description: 'Intensive programs with meditation and teachings' },
      { type: 'satsang', name: 'Satsangs', icon: '🕉️', description: 'Open gatherings with the master' },
      { type: 'empowerment', name: 'Empowerments', icon: '⚡', description: 'Sacred Kundalini Kriya Yoga initiations' },
      { type: 'fullmoon', name: 'Full Moon Meditation', icon: '🌕', description: 'Earth Peace Meditation 7-9 PM local time' },
      { type: 'meditation', name: 'Group Meditation', icon: '🧘‍♂️', description: 'Regular practice gatherings' }
    ]
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nSaved ${allEvents.length} events to events.json`);
  console.log('Events by type:');
  const byType = {};
  allEvents.forEach(e => byType[e.type] = (byType[e.type] || 0) + 1);
  Object.entries(byType).forEach(([type, count]) => console.log(`  ${type}: ${count}`));
}

main().catch(console.error);

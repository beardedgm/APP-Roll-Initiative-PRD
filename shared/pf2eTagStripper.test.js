// shared/pf2eTagStripper.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stripPf2eTags } from './pf2eTagStripper.js';

describe('stripPf2eTags', () => {
  it('strips simple tags to their content', () => {
    assert.equal(stripPf2eTags('{@damage 1d6+1}'), '1d6+1');
    assert.equal(stripPf2eTags('{@dice 1d4}'), '1d4');
    assert.equal(stripPf2eTags('{@condition enfeebled 2}'), 'enfeebled 2');
    assert.equal(stripPf2eTags('{@spell lay on hands}'), 'lay on hands');
    assert.equal(stripPf2eTags('{@skill Deception}'), 'Deception');
    assert.equal(stripPf2eTags('{@trait aura}'), 'aura');
  });

  it('handles {@dc N} → "DC N"', () => {
    assert.equal(stripPf2eTags('{@dc 17}'), 'DC 17');
  });

  it('handles {@ability} → full name', () => {
    assert.equal(stripPf2eTags('{@ability str}'), 'Strength');
    assert.equal(stripPf2eTags('{@ability dex}'), 'Dexterity');
    assert.equal(stripPf2eTags('{@ability con}'), 'Constitution');
    assert.equal(stripPf2eTags('{@ability int}'), 'Intelligence');
    assert.equal(stripPf2eTags('{@ability wis}'), 'Wisdom');
    assert.equal(stripPf2eTags('{@ability cha}'), 'Charisma');
  });

  it('uses display text after || separator', () => {
    assert.equal(stripPf2eTags('{@action Strike||Strikes}'), 'Strikes');
    assert.equal(stripPf2eTags('{@spell magic missile||magic missiles}'), 'magic missiles');
  });

  it('strips multiple tags in one string', () => {
    const input = 'Deal {@damage 2d6} fire damage, {@dc 15} Reflex save';
    assert.equal(stripPf2eTags(input), 'Deal 2d6 fire damage, DC 15 Reflex save');
  });

  it('returns plain text unchanged', () => {
    assert.equal(stripPf2eTags('no tags here'), 'no tags here');
    assert.equal(stripPf2eTags(''), '');
  });

  it('handles nested/recursive tags', () => {
    assert.equal(stripPf2eTags('{@damage {@dice 1d6+3}}'), '1d6+3');
  });

  it('handles {@quickref} by extracting display text', () => {
    assert.equal(stripPf2eTags('{@quickref persistent damage||3|persistent damage}'), 'persistent damage');
  });

  // f10: single-pipe source tags like {@condition sickened|CRB} used to leak the
  // source book code ("sickened|CRB"). Drop the source; show display if present,
  // else the name.
  it('drops the source from single-pipe {@tag name|source} tags', () => {
    assert.equal(stripPf2eTags('{@condition sickened|CRB}'), 'sickened');
    assert.equal(stripPf2eTags("{@item Devil's Trident|LOMM}"), "Devil's Trident");
    assert.equal(stripPf2eTags('{@creature simple harrowkin|SF3}'), 'simple harrowkin');
  });

  it('uses the display segment of a single-pipe {@tag name|source|display} tag', () => {
    assert.equal(stripPf2eTags('{@condition sickened|CRB|sickened 2}'), 'sickened 2');
  });
});

// l2: {@dc} must keep its "DC " prefix in ALL forms — the piped form
// {@dc 20|basic} previously took the generic pipe path and stripped to "20".
describe('stripPf2eTags — {@dc} forms', () => {
  it('plain form keeps the DC prefix', () => {
    assert.equal(stripPf2eTags('{@dc 17}'), 'DC 17');
  });

  it('piped form keeps the DC prefix', () => {
    assert.equal(stripPf2eTags('{@dc 20|basic}'), 'DC 20');
  });

  it('inline in a sentence', () => {
    assert.equal(
      stripPf2eTags('must succeed at a {@dc 20|basic} Fortitude save'),
      'must succeed at a DC 20 Fortitude save'
    );
  });

  it('generic pipe/display behavior for other tags is unchanged', () => {
    assert.equal(stripPf2eTags('{@condition sickened|CRB}'), 'sickened');
    assert.equal(stripPf2eTags('{@condition sickened|CRB|sickened 2}'), 'sickened 2');
  });
});

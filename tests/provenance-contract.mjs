import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const html = fs.readFileSync(new URL('index.html', root), 'utf8');
const ledger = JSON.parse(fs.readFileSync(new URL('provenance/model-parameters.json', root), 'utf8'));

assert.equal(ledger.schema_version, '1.0.0');
assert.match(ledger.reference.doi, /^10\.1109\//);

const allowedStatuses = new Set([
  'paper_table', 'paper_equation', 'figure_reproduction', 'inferred_from_figure',
  'assumed_reconstruction', 'teaching_extension', 'numerical_control',
]);
const entries = [...ledger.parameters, ...ledger.numerical_defaults];
const ids = entries.map(entry => entry.id);
assert.equal(new Set(ids).size, ids.length, 'provenance IDs must be unique');

for (const entry of entries) {
  assert.ok(entry.id && entry.status && entry.code_anchor, `incomplete provenance entry: ${entry.id}`);
  assert.ok(allowedStatuses.has(entry.status), `unknown provenance status for ${entry.id}: ${entry.status}`);
  assert.ok(html.includes(entry.code_anchor),
    `provenance anchor for ${entry.id} is absent from index.html: ${entry.code_anchor}`);
  if (entry.status === 'inferred_from_figure' || entry.status === 'assumed_reconstruction') {
    assert.ok(entry.source && entry.source.length >= 20,
      `${entry.id} must explain why the value is not paper-tabulated`);
  }
}

for (const required of [
  'qs.initial_fraction', 'qs.boundary_source_weight', 'voc.reference_concentration',
  'voc.multispecies_coupling', 'electrical.ion_channel_normalization',
  'electrical.branch_default', 'optical.flash_start', 'optical.irradiance_scale',
  'optical.flash_train_default', 'optical.As_paper', 'optical.As_figure',
]) {
  assert.ok(ids.includes(required), `required provenance record missing: ${required}`);
}

assert.notEqual(
  ledger.parameters.find(entry => entry.id === 'optical.As_paper').status,
  ledger.parameters.find(entry => entry.id === 'optical.As_figure').status,
  'paper-equation and figure-reproduction paths must carry different provenance statuses',
);

const localPdf = new URL('docs/akyildiz2026-tmbmc-algae-channels.pdf', root);
if (fs.existsSync(localPdf)) {
  const digest = crypto.createHash('sha256').update(fs.readFileSync(localPdf)).digest('hex');
  assert.equal(digest, ledger.reference.local_pdf_sha256,
    'docs/akyildiz2026-tmbmc-algae-channels.pdf changed; re-audit the paper and update provenance deliberately');
}

console.log(`provenance contract checks passed (${entries.length} records)`);

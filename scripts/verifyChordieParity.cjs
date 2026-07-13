const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')

function transpile(file) {
  return ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText
}

function evaluate(source, requireImpl) {
  const module = { exports: {} }
  const wrapper = `(function (exports, module, require) { ${source}\n})`
  vm.runInThisContext(wrapper)(module.exports, module, requireImpl)
  return module.exports
}

const catalog = evaluate(
  transpile('src/renderer/src/utils/chordieChordCatalog.ts'),
  require
)
const recognition = evaluate(
  transpile('src/renderer/src/utils/chordRecognition.ts'),
  (id) => id === './chordieChordCatalog' ? catalog : require(id)
)

assert.equal(catalog.CHORDIE_CHORDS.length, 206)

const fixtures = [
  { label: 'C', notes: [60, 64, 67], names: ['C'] },
  { label: 'C/E', notes: [52, 55, 60], names: ['C / E'] },
  { label: 'C/G', notes: [55, 60, 64], names: ['C / G'] },
  { label: 'C7', notes: [60, 64, 67, 70], names: ['C 7', 'E dim / C'] },
  { label: 'C6', notes: [60, 64, 67, 69], names: ['C Maj6', 'A 7(no3) / C'] },
  { label: 'Am7', notes: [57, 60, 64, 67], names: ['A min7', 'C / A'] },
  {
    label: 'C9',
    notes: [48, 52, 55, 58, 62],
    names: ['C 9', 'G min / C Major 3rd', 'E min7b5 / C']
  },
  {
    label: 'C + D major structure',
    notes: [48, 52, 55, 62, 66, 69],
    names: ['C 6/9(#11)', 'D / C', 'G Maj7 Sus2 / C Major 3rd', 'E min9(11) / C']
  },
  {
    label: 'C bass + E minor',
    notes: [48, 64, 67, 71],
    names: ['C Maj7', 'E min / C']
  },
  { label: 'octaves', notes: [48, 60, 72], names: ['C Octave'] },
  { label: 'alternate Maj7 label', notes: [48, 55, 59], names: ['C Maj7'] },
  { label: 'alternate Maj7 inversion', notes: [55, 59, 60], names: ['C Maj7 / G'] },
  { label: 'default flat spelling', notes: [56, 68, 80], names: ['Ab Octave'] },
  { label: 'octave-doubled tritone', notes: [54, 60, 66, 84], names: ['F# Tritone'] },
  {
    label: 'quality-based duplicate removal',
    notes: [41, 45, 47, 49, 59, 64, 70, 80],
    names: ['F n.c.', 'E Maj(b5) / C# 7#5 / F', 'C# min7(13) / F Maj(b5)', 'A n.c. / F']
  },
  {
    label: 'neutral interval and n.c. identities',
    notes: [37, 43, 53, 67, 78, 79],
    names: ['C# n.c.', 'G Major 7th / C# Maj(b5)', 'F n.c. / C# Tritone', 'G n.c. / C#']
  },
  { label: 'Chordie MIDI range', notes: [20, 60, 64, 67, 109], names: ['C'] },
  { label: 'duplicate MIDI input state', notes: [60, 60, 64, 67], names: ['C'] }
]

for (const fixture of fixtures) {
  const actual = recognition.recognizeChordCandidates(fixture.notes).map((candidate) => candidate.name)
  assert.deepEqual(actual, fixture.names, fixture.label)
}

assert.equal(
  recognition.recognizeChordCandidates([53, 65], 1)[0].name,
  'E# Octave',
  'C# key-center spelling'
)

console.log(`Chordie parity fixtures passed: ${fixtures.length}`)

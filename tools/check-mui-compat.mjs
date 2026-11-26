// 정식 TypeScript 검사를 대체하지 않는 MUI 9 스타일/폐기 API 회귀 검사.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const systemStyleProps = [
  'display', 'fontSize', 'fontWeight', 'fontFamily', 'fontStyle', 'lineHeight',
  'letterSpacing', 'textAlign', 'whiteSpace', 'textOverflow', 'overflow', 'overflowX', 'overflowY',
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'alignItems', 'justifyContent',
  'alignSelf', 'flex', 'flexWrap', 'flexGrow', 'flexShrink', 'flexDirection', 'gap', 'rowGap', 'columnGap',
  'position', 'top', 'right', 'bottom', 'left', 'zIndex', 'bgcolor', 'border', 'borderRadius',
  'm', 'mt', 'mr', 'mb', 'ml', 'mx', 'my', 'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'p', 'pt', 'pr', 'pb', 'pl', 'px', 'py', 'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
];
const rules = {
  Typography: new Set([...systemStyleProps, 'color']),
  Stack: new Set(systemStyleProps),
  Autocomplete: new Set(['renderTags']),
  Checkbox: new Set(['inputProps']),
  TextField: new Set(['InputProps', 'InputLabelProps', 'inputProps', 'SelectProps', 'FormHelperTextProps']),
};

function inspect(file, source, fixes = []) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imported = new Map();
  const namespaces = new Set();
  for (const stmt of tree.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier) || !stmt.importClause) continue;
    const moduleName = stmt.moduleSpecifier.text;
    const { name, namedBindings } = stmt.importClause;
    if (moduleName === '@mui/material') {
      if (namedBindings && ts.isNamedImports(namedBindings)) {
        for (const element of namedBindings.elements) imported.set(element.name.text, (element.propertyName ?? element.name).text);
      } else if (namedBindings && ts.isNamespaceImport(namedBindings)) namespaces.add(namedBindings.name.text);
    } else if (moduleName.startsWith('@mui/material/') && name) {
      imported.set(name.text, moduleName.split('/')[2]);
    }
  }
  const issues = [];
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(tree);
      const [namespace, member] = tag.split('.');
      const component = imported.get(tag) ?? (namespaces.has(namespace) ? member : undefined);
      const forbidden = rules[component];
      if (forbidden instanceof Set) {
        const attrs = [...node.attributes.properties];
        const bad = attrs.filter(prop => ts.isJsxAttribute(prop) && forbidden.has(prop.name.getText(tree)));
        for (const prop of bad) {
          const { line, character } = tree.getLineAndCharacterOfPosition(prop.getStart(tree));
          issues.push(`${file}:${line + 1}:${character + 1} ${component}.${prop.name.getText(tree)} — sx 또는 MUI 9의 현재 API 사용 필요`);
        }
        // 명시적으로 --fix를 요청한 경우에만 단순 스타일 속성을 이동한다.
        // spread, 복잡한 sx, 주석이 포함된 속성 등은 자동 수정하지 않는다.
        if (bad.length && (component === 'Typography' || component === 'Stack') &&
            !attrs.some(prop => ts.isJsxSpreadAttribute(prop))) {
          const sx = attrs.filter(prop => ts.isJsxAttribute(prop) && prop.name.getText(tree) === 'sx');
          const object = sx[0]?.initializer && ts.isJsxExpression(sx[0].initializer) ? sx[0].initializer.expression : undefined;
          const existingKeys = new Set(object && ts.isObjectLiteralExpression(object) ? object.properties.flatMap(prop => prop.name && (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) ? [prop.name.text] : []) : []);
          const entries = bad.map(prop => {
            const key = prop.name.getText(tree);
            const value = prop.initializer;
            if (existingKeys.has(key)) return ''; // 기존 sx 우선, 중복 키 생성 금지
            if (!value) return null;
            if (ts.isStringLiteral(value)) {
              // JSX entities must not be reinterpreted as literal strings.
              if (value.text.includes('&')) return null;
              const palette = { primary: 'primary.main', secondary: 'secondary.main', error: 'error.main', warning: 'warning.main', info: 'info.main', success: 'success.main', textPrimary: 'text.primary', textSecondary: 'text.secondary', disabled: 'text.disabled' };
              const styleValue = key === 'color' && Object.hasOwn(palette, value.text) ? palette[value.text] : value.text;
              return `${key}: ${JSON.stringify(styleValue)}`;
            }
            if (key !== 'color' && ts.isJsxExpression(value) && value.expression && !/\/\*|\/\//.test(value.getText(tree)))
              return `${prop.name.getText(tree)}: (${value.expression.getText(tree)})`;
            return null;
          });
          if (entries.every(entry => entry !== null) && sx.length <= 1 && (!sx.length || (object && ts.isObjectLiteralExpression(object)))) {
            const body = object ? object.getText(tree).slice(1, -1).trim() : '';
            const prefix = entries.filter(Boolean).join(', ');
            const replacement = `sx={{ ${[prefix, body].filter(Boolean).join(', ')} }}`;
            const anchor = sx[0] ?? bad[0];
            fixes.push({ start: anchor.getStart(tree), end: anchor.getEnd(), text: replacement });
            for (const prop of bad) if (prop !== anchor) fixes.push({ start: prop.getStart(tree), end: prop.getEnd(), text: '' });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return issues;
}
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : path.endsWith('.tsx') ? [path] : [];
  });
}
// 과거 오류 패턴과 정상 패턴을 검사기 자체에서도 검증한다.
assert.equal(inspect('fixture.tsx', `import { Typography as T, Autocomplete, Checkbox, Stack } from '@mui/material'; const a = <><T display="block"/><Autocomplete renderTags={()=>null}/><Checkbox inputProps={{}}/><Stack alignItems="center"/></>;`).length, 4);
assert.equal(inspect('fixture.tsx', `import T from '@mui/material/Typography'; const a = <T component="span" sx={{ display: 'block', color: 'text.secondary' }} />;`).length, 0);
assert.equal(inspect('fixture.tsx', `const a = <Typography display="block"/>;`).length, 0);
function applyFixes(source, edits) {
  let result = source;
  let boundary = source.length;
  for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
    if (edit.end > boundary) return source; // nested overlapping edits: manual inspection
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
    boundary = edit.start;
  }
  return result;
}
const sample = `import { Typography, Stack } from '@mui/material'; const a = <><Typography display="block" sx={{ mt: 1 }}/><Stack alignItems="center" /></>;`;
const sampleFixes = [];
assert.equal(inspect('fixture.tsx', sample, sampleFixes).length, 2);
assert.equal(inspect('fixture.tsx', applyFixes(sample, sampleFixes)).length, 0);
const duplicate = `import { Typography } from '@mui/material'; const a = <Typography display="block" color="primary" sx={{ display: 'flex' }} />;`;
const duplicateFixes = [];
inspect('fixture.tsx', duplicate, duplicateFixes);
const fixedDuplicate = applyFixes(duplicate, duplicateFixes);
assert.equal(inspect('fixture.tsx', fixedDuplicate).length, 0);
assert.equal((fixedDuplicate.match(/display:/g) ?? []).length, 1);
assert.ok(fixedDuplicate.includes('primary.main'));
const unsafe = `import { Typography } from '@mui/material'; const a = <Typography display="block" sx={styles} />;`;
const unsafeFixes = [];
inspect('fixture.tsx', unsafe, unsafeFixes);
assert.equal(unsafeFixes.length, 0);
const sourceFiles = files('src');
const fixRequested = process.argv.includes('--fix');
const issues = sourceFiles.flatMap(file => {
  const original = readFileSync(file, 'utf8');
  if (!fixRequested) return inspect(file, original);
  const fixes = [];
  inspect(file, original, fixes);
  const updated = applyFixes(original, fixes);
  if (updated !== original) {
    const tree = ts.createSourceFile(file, updated, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    if (!tree.parseDiagnostics.length) {
      writeFileSync(file, updated);
      console.log(`스타일 속성 수정: ${file}`);
      return inspect(file, updated);
    }
  }
  return inspect(file, original);
});
if (issues.length) {
  console.error(issues.join('\n'));
  console.error('단순 스타일 속성은 npm run check:mui -- --fix 로 수정할 수 있습니다. 나머지는 직접 확인하세요.');
  process.exitCode = 1;
} else {
  console.log(`MUI 호환성 사전 검사: ${sourceFiles.length}개 TSX 파일 통과 (정식 타입 검사는 별도 실행)`);
}

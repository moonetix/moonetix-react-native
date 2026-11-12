'use strict';

// Pure text edits for the Expo config plugin, so they can be tested without Expo.

const MAVEN_URL = 'https://moonetix.com/maven';

// Valid in Groovy and Kotlin build scripts.
function repoBlock(indent, unit = '    ') {
  return [
    `${indent}maven {`,
    `${indent}${unit}url = uri("${MAVEN_URL}")`,
    `${indent}${unit}content {`,
    `${indent}${unit}${unit}includeGroup("com.moonetix")`,
    `${indent}${unit}}`,
    `${indent}}`,
  ].join('\n');
}

function hasRepo(contents) {
  return contents.includes(MAVEN_URL);
}

// Index of the "}" that closes the block whose "{" is at openIndex, skipping strings and comments.
function blockEnd(text, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '/' && next === '/') {
      const nl = text.indexOf('\n', i);
      i = nl === -1 ? text.length : nl;
      continue;
    }
    if (c === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 1;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < text.length && text[j] !== c) {
        j += text[j] === '\\' ? 2 : 1;
      }
      i = j;
      continue;
    }
    if (c === '{') {
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

// Finds `name {` at the top level of text[from, to) and returns the index of its "{".
function findBlock(text, name, from, to) {
  const re = new RegExp(`(^|[\\s;{])${name}\\s*(\\([^)]*\\))?\\s*\\{`, 'g');
  re.lastIndex = from;
  let m;
  while ((m = re.exec(text)) !== null && m.index < to) {
    const open = text.indexOf('{', m.index + m[1].length + name.length);
    if (open < to) {
      return open;
    }
  }
  return -1;
}

function lineIndent(text, index) {
  const start = text.lastIndexOf('\n', index) + 1;
  const m = /^[ \t]*/.exec(text.slice(start));
  return m ? m[0] : '';
}

// Inserts the repository at the top of `repositories { }` inside the given outer block.
function insertIntoRepositories(text, outerName) {
  const outer = findBlock(text, outerName, 0, text.length);
  if (outer === -1) {
    return null;
  }
  const outerEnd = blockEnd(text, outer);
  if (outerEnd === -1) {
    return null;
  }
  const repos = findBlock(text, 'repositories', outer + 1, outerEnd);
  if (repos === -1) {
    return null;
  }
  // Follow the file's own indentation step (Expo uses 2 spaces, React Native 4).
  const reposIndent = lineIndent(text, repos);
  const outerIndent = lineIndent(text, outer);
  const unit = reposIndent.length > outerIndent.length ? reposIndent.slice(outerIndent.length) : '    ';
  return text.slice(0, repos + 1) + '\n' + repoBlock(reposIndent + unit, unit) + text.slice(repos + 1);
}

/** android/build.gradle: adds the Moonetix repository to allprojects { repositories { } }. */
function addMavenRepoToBuildGradle(contents) {
  if (hasRepo(contents)) {
    return contents;
  }
  const inserted = insertIntoRepositories(contents, 'allprojects');
  if (inserted !== null) {
    return inserted;
  }
  const sep = contents.endsWith('\n') ? '' : '\n';
  return `${contents}${sep}\nallprojects {\n    repositories {\n${repoBlock('        ')}\n    }\n}\n`;
}

/**
 * android/settings.gradle: only when the project declares dependencyResolutionManagement with
 * repositories, adds the Moonetix repository there too. Otherwise returns the contents unchanged.
 */
function addMavenRepoToSettingsGradle(contents) {
  if (hasRepo(contents)) {
    return contents;
  }
  const inserted = insertIntoRepositories(contents, 'dependencyResolutionManagement');
  return inserted === null ? contents : inserted;
}

module.exports = {
  MAVEN_URL,
  addMavenRepoToBuildGradle,
  addMavenRepoToSettingsGradle,
};

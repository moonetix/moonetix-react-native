import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const gradle = require('../plugin/gradle') as {
  MAVEN_URL: string;
  addMavenRepoToBuildGradle(contents: string): string;
  addMavenRepoToSettingsGradle(contents: string): string;
};

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
const count = (text: string, part: string) => text.split(part).length - 1;

describe('addMavenRepoToBuildGradle', () => {
  it('adds the repository inside allprojects { repositories { } } of the Expo template', () => {
    const before = fixture('expo-build.gradle');
    const after = gradle.addMavenRepoToBuildGradle(before);
    expect(count(after, gradle.MAVEN_URL)).toBe(1);
    const allprojects = after.slice(after.indexOf('allprojects {'));
    const repos = allprojects.slice(allprojects.indexOf('repositories {'));
    expect(repos.indexOf(gradle.MAVEN_URL)).toBeLessThan(repos.indexOf('google()'));
    expect(after).toContain('includeGroup("com.moonetix")');
    // buildscript repositories stay untouched
    const buildscript = after.slice(0, after.indexOf('allprojects {'));
    expect(buildscript).not.toContain(gradle.MAVEN_URL);
    expect(count(after, '{')).toBe(count(after, '}'));
  });

  it('is idempotent', () => {
    const once = gradle.addMavenRepoToBuildGradle(fixture('expo-build.gradle'));
    expect(gradle.addMavenRepoToBuildGradle(once)).toBe(once);
  });

  it('appends an allprojects block when the project has none (React Native template)', () => {
    const before = fixture('rn-build.gradle');
    const after = gradle.addMavenRepoToBuildGradle(before);
    expect(after.startsWith(before)).toBe(true);
    expect(after.slice(before.length)).toContain('allprojects {\n    repositories {\n        maven {');
    expect(count(after, '{')).toBe(count(after, '}'));
  });

  it('ignores braces in strings and comments', () => {
    const before = [
      'allprojects {',
      '    // a } in a comment',
      '    def s = "}"',
      '    repositories {',
      '        mavenCentral()',
      '    }',
      '}',
      '',
    ].join('\n');
    const after = gradle.addMavenRepoToBuildGradle(before);
    expect(after).toBe(
      [
        'allprojects {',
        '    // a } in a comment',
        '    def s = "}"',
        '    repositories {',
        '        maven {',
        '            url = uri("https://moonetix.com/maven")',
        '            content {',
        '                includeGroup("com.moonetix")',
        '            }',
        '        }',
        '        mavenCentral()',
        '    }',
        '}',
        '',
      ].join('\n'),
    );
  });
});

describe('addMavenRepoToSettingsGradle', () => {
  it('leaves settings without dependencyResolutionManagement alone (Expo template)', () => {
    const before = fixture('expo-settings.gradle');
    expect(gradle.addMavenRepoToSettingsGradle(before)).toBe(before);
  });

  it('adds the repository to dependencyResolutionManagement repositories, not pluginManagement', () => {
    const before = [
      'pluginManagement {',
      '    repositories {',
      '        gradlePluginPortal()',
      '    }',
      '}',
      'dependencyResolutionManagement {',
      '    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)',
      '    repositories {',
      '        google()',
      '    }',
      '}',
      '',
    ].join('\n');
    const after = gradle.addMavenRepoToSettingsGradle(before);
    expect(count(after, gradle.MAVEN_URL)).toBe(1);
    expect(after.indexOf(gradle.MAVEN_URL)).toBeGreaterThan(after.indexOf('dependencyResolutionManagement'));
    expect(after.indexOf(gradle.MAVEN_URL)).toBeLessThan(after.indexOf('google()'));
    expect(gradle.addMavenRepoToSettingsGradle(after)).toBe(after);
  });
});

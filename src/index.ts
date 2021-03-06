#!/usr/bin/env node
import parseArgs from 'minimist';
import {refineOptions, testPack} from './testpack';

// Originally --packagejson was --package.json; unfortunately minimist
// translates it to {"package":{"json":{...}}} not {"package.json":{...}}.
var aliases = {
  '?':"help", p:"packagejson", o:"test-folder", s:"test-script", v:"verbose",
  r:"replace-import", replace:"replace-import", R:"rmdir", '!':"nontest",
};
var args = parseArgs(process.argv.slice(2), {alias:aliases});
Object.keys(aliases).forEach(a => delete args[a]); // delete aliases

if (args.help) {
  console.log(`Usage: testpack [Options] [<Test patterns>]
  Attempts to verify that your npm package is set up properly by installing
  the packaged version in a special test folder with its own custom 
  package.json file, then running a copy of your unit tests against it.
    
  <Test patterns> are glob patterns used to recognize source files that are
  test-related and so should be copied to the new project. The default test
  patterns are \`test* *test.* *tests.* *test*/** tsconfig.json\`. 
  Note: the glob package is used to match test patterns. It requires slash 
  (/) as the path separator even on Windows; backslashes escape "special" 
  characters such as braces.
  
  Options:
  --dirty
        The contents of the test folder are normally deleted at the start.
        This option skips the deletion step, potentially leaving extra files
        in the test folder (also: runs faster npm ci instead of npm install)
  --setup-command=command
        A setup command to run instead of \`npm install\` (your package is
        still installed afterward with \`npm install ________.tgz\` and 
        \`npm install\` is still used by the \`--install\` option.) To save
        time by skipping install when packages in the test folder are 
        already installed, use \`--dirty --setup-command=""\`.
  -p, --packagejson=key:value, --packagejson={...}
        Merges data into the new package.json file. If the new value is a 
        primitive, it overwrites the old value. If the old value is a 
        primitive, it is treated as an array. If both are arrays, they are
        concatenated. If either one is an object, they are merged in the 
        obvious way, recursively. For example:
          Old value: \`{"a":["hi"], "b":7, "c":[3], "x":{"D":4}}\`
          New value: \`{"a":1,"b":[8],"c":[4],"x":{"D":{"two":2},"E":5}}\`
          Out: \`{"a":1,"b":[7,8],"c":[3,4],"x":{"D":{"0":4,"two":2},"E":5}}\`
        You can use \`undefined\` to delete an existing value, e.g.
          --packagejson={testpack:undefined,repository:undefined}
  -o, --test-folder=path
        Path to test folder. Created if necessary.
  -r, --replace-import !pat1!pat2!
        Searches js/mjs/ts/tsx test files for require/import filenames using 
        regex pattern 1, replacing it with pattern 2. Instead of \`!\`s you are
        allowed to use any punctuation mark that doesn't appear in the 
        patterns. Pattern 2 can use $1 through $9 to re-emit captured 
        strings, and $P is replaced with your package's name. Replacements 
        only affect non-test files unless you add --replace-test-imports. 
        If this option is not used then the following default replacement 
        patterns are used:
          |\.\.?|$P| and |\.\.?([\/\\].*)|$P$1|
        Basically, \`.\` and \`..\` are replaced with the package name. UTF-8 
        encoding is assumed in test files, and the regex must match the whole 
        filename unless your regex uses \`^\` or \`$\`.
  --regex ext/regex/
        For the purpose of modifying import/require commands, files with the
        specified extension(s) are searched using this regular expression,
        and the first captured group is treated as a filename that may need 
        to be modified. For example, this built-in regex is used to match
        require commands that use double quotes:
          --regex js/require\s*\(\s*"((?:[^\\"]|\\.)*)"/
        You can specify multiple extensions separated by commas: \`js,mjs\`
  -R, --rmdir
        Remove entire test folder when done (by default, only the contents
        of node_modules and the tgz from \`npm pack\` is deleted.)
  --delete-on-fail
        Delete the test folder & tgz even when tests fail.
  -s, --test-script=name
        Name of test script to run with \`npm run\` (default: \`test\`).
  --install package
        Runs \`npm install --save-dev package\` in the test project.
  --keep package
        Prevents removal of package(s) from dependencies or devDependencies.
  --prepacked
        Skips running \`npm pack\` but installs the .tgz file it normally
        produces (name-version.tgz). This option also prevents the deletion 
        of the tar.gz file on exit.
  --prepacked=file
        Skips running \`npm pack\` and installs the specified file.
  --show-json
        Shows the JSON equivalent of the specified arguments, then quits.
        You can put these settings in a "testpack" section of package.json.
  -!, --nontest pattern
        Ignores the specified files (glob pattern) when searching for tests.
  -v, --verbose
        Emits more text describing what testpack is doing.
  `);
} else if (args['show-json']) {
  delete args['show-json'];
  console.log(JSON.stringify({ testpack: refineOptions(args) }, undefined, 2));
} else {
  try {
    var opts = refineOptions(args);
    var result = testPack(opts);
    process.exit(result.status);
  } catch(err) {
    console.log("*** ERROR ***");
    console.log(err);
    process.exit(-1);
  }
}

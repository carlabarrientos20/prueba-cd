import globals from "globals";
import path from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import pluginJs from '@eslint/js';
import babelParser from '@babel/eslint-parser';
import airbnbBaseConfig from "eslint-config-airbnb-base";


// mimic CommonJS variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: pluginJs.configs.recommended
});

export default [
    {
        files: ["**/*.js"],
        languageOptions: {
            sourceType: "module",
            parser: babelParser, // Utiliza el parser correcto
            parserOptions: {
                requireConfigFile: false,
            },
            globals: globals.browser
        },

        rules: {
            ...airbnbBaseConfig.rules,
            "camelcase": "off",
            "import/no-dynamic-require": "off"
        }
    },
    {
        languageOptions: {
            globals: {
                describe: "readonly",
                it: "readonly",
                expect: "readonly"
            }
        }
    }
];
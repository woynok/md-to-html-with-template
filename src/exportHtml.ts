'use strict';

import * as fs from "fs";
import * as path from 'path';
import { commands, ExtensionContext, TextDocument, Uri, window, workspace } from 'vscode';
import { format } from "prettier";
import mustache = require('mustache');
import MarkdownIt = require('markdown-it');
import { isMdDocument } from "./isMdDocument";
import { unescapeAll, escapeHtml } from "markdown-it/lib/common/utils";

let thisContext: ExtensionContext;
const hljs = require('highlight.js/lib/common');

function myFence(tokens: any, idx: any, options: any, env: any, slf: any): string {
    let token = tokens[idx];
    // fenceのwhite spaceで途切れる問題を解消するための、
    // この1行を変えるためだけのoverwrite
    // info = token.info ? unescapeAll(token.info).trim() : '',
    let info = token.info ? unescapeAll(token.info) : '';
    let highlighted, i, tmpAttrs, tmpToken;

    // 記法として:区切りのため修正
    let blockLang = info.split(':')[0] || '';
    let blockName = info.split(':')[1] || '';

    if (options.highlight) {
        // ここもlangNameではなくinfoが入るように修正
        highlighted = options.highlight(token.content, blockLang, blockName) || escapeHtml(token.content);
    } else {
        highlighted = escapeHtml(token.content);
    }

    if (highlighted.indexOf('<pre') === 0) {
        return highlighted + '\n';
    }

    // If language exists, inject class gently, without modifying original token.
    // May be, one day we will add .clone() for token and simplify this part, but
    // now we prefer to keep things local.
    if (info) {
        i = token.attrIndex('class');
        tmpAttrs = token.attrs ? token.attrs.slice() : [];

        if (i < 0) {
            tmpAttrs.push(['class', options.langPrefix + blockLang]);
        } else {
            tmpAttrs[i][1] += ' ' + options.langPrefix + blockLang;
        }

        // Fake token just to render attributes
        tmpToken = {
            attrs: tmpAttrs
        };

        return '<pre><code' + slf.renderAttrs(tmpToken) + '>'
            + highlighted
            + '</code></pre>\n';
    } else {
        return '';
    }
}

async function exportHtml(uri?: Uri, outFolder?: string) {
    const editor = window.activeTextEditor;

    if (!editor || !isMdDocument(editor?.document)) {
        window.showErrorMessage("マークダウンドキュメントを開き、選択して実行してください。");
        return;
    }

    const doc = uri ? await workspace.openTextDocument(uri) : editor.document;
    if (doc.isDirty || doc.isUntitled) {
        doc.save();
    }

    const statusBarMessage = window.setStatusBarMessage("$(sync~spin) " + "マークダウンをhtmlに変換中…");

    if (outFolder && !fs.existsSync(outFolder)) {
        fs.mkdirSync(outFolder, { recursive: true });
    }

    /**
     * Modified from <https://github.com/Microsoft/vscode/tree/master/extensions/markdown>
     * src/previewContentProvider MDDocumentContentProvider provideTextDocumentContent
     */
    let outPath = outFolder ? path.join(outFolder, path.basename(doc.fileName)) : doc.fileName;
    outPath = outPath.replace(/\.\w+?$/, '.html');
    outPath = outPath.replace(/^([cdefghij]):\\/, function (_, p1: string) {
        return `${p1.toUpperCase()}:\\`; // Capitalize drive letter
    });
    if (!outPath.endsWith('.html')) {
        outPath += '.html';
    }

    //// Determine document title.
    // find the first ATX heading, and use it as title

    // Editors treat `\r\n`, `\n`, and `\r` as EOL.
    // Since we don't care about line numbers, a simple alternation is enough and slightly faster.
    let title = doc.getText().split(/\n|\r/g).find(lineText => lineText.startsWith('#') && /^#{1,6} /.test(lineText));
    if (title) {
        title = title.replace(/<!--(.*?)-->/g, '');
        title = title.trim().replace(/^#+/, '').replace(/#+$/, '').trim();
    }

    //// Render body HTML.
    let md = new MarkdownIt({
        html: true,
        breaks: false,
        highlight: function (blockContent: string, blockLang: string, blockName: string) {
            if (blockLang && hljs.getLanguage(blockLang)) {
                try {
                    blockContent = hljs.highlight(blockContent, { language: blockLang, ignoreIllegals: true }).value;
                } catch (e: any) {
                    blockContent = md.utils.escapeHtml(blockContent);
                    window.showErrorMessage('Error: markdown-it:highlight');
                }
            } else {
                blockContent = md.utils.escapeHtml(blockContent);
            }
            let codeHeader = '<div class="language">' + blockLang.toLowerCase() + '</div>' + '<div class="name">' + blockName + '</div>';
            // mermaid なら renderする
            if (blockLang === 'mermaid' || blockLang === 'Mermaid') {
                let hasMermaid = true;
                return '<pre class="codeblock">' + codeHeader + '<div class="mermaid">' + "%%{init: {'theme':'dark}}%%\n" + blockContent + '</div></pre>\n';
            } else if (blockLang !== '') {
                return '<pre class="codeblock">' + codeHeader + '<code class="language-' + blockLang.toLowerCase() + '"><div>' + blockContent + '</div></code></pre>\n';
            } else {
                return '<pre class="codeblock">' + codeHeader + '<code class="language-unknown"><div>' + blockContent + '</div></code></pre>\n';
            }
        }
    });

    md.use(require('markdown-it-checkbox'));
    md.renderer.rules.fence = myFence;
    let body = md.render(doc.getText());

    let directory = workspace.getWorkspaceFolder(doc.uri)?.uri.fsPath || "";
    
    // let templateFilepath = doc.getWordRangeAtPosition(doc.positionAt(0), regex = 

    // get first line of document for template filepath
    // if first line matches pattern of <!-- TEMPLATE:some_file_path.html -->, then use that file as template
    // else use default template (template/template.html)
    const firstLineText = doc.lineAt(0).text;
    let hasCustomTemplateFilepath = /^<!-- TEMPLATE:(.*?)-->/.exec(firstLineText);
    let defaultTemplateFilepath = 'template/template.html';
    let templateFilepath: string = hasCustomTemplateFilepath === null ? defaultTemplateFilepath : hasCustomTemplateFilepath[1].trim();

    let template = fs.readFileSync(path.join(directory, templateFilepath), 'utf-8');
    let view = {
        title: title ? title : '',
        contents: body,
    };
    let html = format(
        mustache.render(template, view),
        {
            parser: "html",
            printWidth: 260,
        }
    );

    fs.writeFile(outPath, html, 'utf-8', function (err) {
        if (err) {
            console.log(err);
        } else {
            window.showInformationMessage('🐶 ' + title + ' をhtml化しました0 🐶');
        }
    });

    // Hold the message for extra 500ms, in case the operation finished very fast.
    setTimeout(() => statusBarMessage.dispose(), 100);
}

export function activate(context: ExtensionContext) {
    thisContext = context;
    context.subscriptions.push(
        commands.registerCommand('md-to-html-with-template.exportHtml', () => { exportHtml(); }),
        workspace.onDidSaveTextDocument(onDidSave)
    );
}

export function deactivate() { }

function onDidSave(doc: TextDocument) {
    if (
        doc.languageId === 'markdown'
        && workspace.getConfiguration('md-to-html-with-template.export', doc.uri).get<boolean>('onFileSave')
    ) {
        exportHtml();
    }
}

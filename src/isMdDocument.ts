'use strict';

import {ExtensionContext, TextDocument, workspace } from 'vscode';

let thisContext: ExtensionContext;

export function isMdDocument(doc: TextDocument | undefined): boolean {
    if (doc) {
        const extraLangIds = workspace.getConfiguration("markdown.extension").get<Array<string>>("extraLangIds");
        const langId = doc.languageId;
        if (extraLangIds?.includes(langId)) {
            return true;
        }
        if (langId === "markdown") {
            return true;
        }
    }
    return false;
}

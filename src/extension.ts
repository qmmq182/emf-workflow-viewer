// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {convertEmfWorkflowToDot} from './workflow';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	let previewCmd = vscode.commands.registerCommand('emf-workflow-viewer.preview', () => {
		let myDoc = vscode.window.activeTextEditor?.document;
		let dotString = currentActiveTextToDot(myDoc);
		let options = {
			document: myDoc,
			content: dotString
		};
		vscode.commands.executeCommand("graphviz-interactive-preview.preview.beside", options);
	});
	
	let previewCmdShowOnColOne = vscode.commands.registerCommand('emf-workflow-viewer.previewColOne', () => {
		let myDoc = vscode.window.activeTextEditor?.document;
		let dotString = currentActiveTextToDot(myDoc);
		let options = {
			document: myDoc,
			content: dotString,
			displayColumn: vscode.ViewColumn.One
		};
		vscode.commands.executeCommand("graphviz-interactive-preview.preview.beside", options);
	});

	context.subscriptions.push(previewCmd);
	context.subscriptions.push(previewCmdShowOnColOne);
}

function currentActiveTextToDot(doc: vscode.TextDocument | undefined) {
	let finalDot = "";
	
	if (!doc) {
		console.log("Cannot find a active document.");
		return;
	}
	let myText = doc?.getText();
	// console.log(myText);

	if (myText) {
		console.log("Parse emf workflow start...");
		finalDot = convertEmfWorkflowToDot(myText);
		console.log("Parse emf workflow finished.");
		// console.log(`FINAL DOT STRING: \n ${finalDot}`);
	}
	return finalDot;
}

// This method is called when your extension is deactivated
export function deactivate() {}

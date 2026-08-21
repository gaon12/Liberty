import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('js/login-request.js'), 'utf8');
const template = readFileSync(resolve('templates/LoginModal.mustache'), 'utf8');

for (const required of [
	'Object.freeze({',
	"typeof loginToken !== 'string'",
	'form.reportValidity()',
	'submit.disabled = pending',
	'alert.textContent = message',
	"password.type = shouldShow ? 'text' : 'password'",
]) {
	if (!source.includes(required)) {
		throw new Error(`Login boundary is missing: ${required}`);
	}
}

for (const forbidden of [
	'window.LoginManage',
	'innerHTML',
	'insertAdjacentHTML',
]) {
	if (source.includes(forbidden)) {
		throw new Error(
			`Login code must not expose or inject through ${forbidden}.`,
		);
	}
}

for (const required of [
	'autocomplete="username"',
	'autocomplete="current-password"',
	'data-whale-modal-autofocus',
	'aria-live="assertive"',
	'type="button" class="whale-login-password-toggle"',
]) {
	if (!template.includes(required)) {
		throw new Error(`Login markup is missing: ${required}`);
	}
}

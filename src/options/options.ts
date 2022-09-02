import { NotionClient } from '../apis/notion';
import { Storage } from '../apis/storage';
import { OAuth2 } from '../apis/oauth';

import { EmojiField, InputFieldValidator, RequiredNotionDatabaseIdField, RequiredStringField, StringField, typeGuards } from './validator';
import { CONFIGURATION, SupportedTypes } from './configuration';

import { Element, Button, Select, KeyValueGroup } from '../elements';
import { RestoreDefaultsButton, RestoreSavedButton } from './RestoreButtons';
import { PropertySelect, SelectPropertyValueSelect } from './PropertySelects';

import { SavedFields } from '../types/storage';
import { valueof } from '../types/utils';
import { number } from 'yargs';
import { EmojiRequest } from '../types/notion';

// if an id ever changes in HTML, it must be updated here
// static type checking will then be available through ElementId
interface OptionsElements {
	restore: {
		timeZone: 'options-restore-timezone';
		canvasCourseCodes: 'options-restore-canvas-course-codes';
		notionPropertyNames: 'options-restore-notion-property-names';
		notionPropertyValues: 'options-restore-notion-property-values';
		notionEmojis: 'options-restore-notion-emojis';
		all: 'options-restore-all';
		undo: 'options-undo-all';
	};
	buttons: {
		oauth: 'notion-oauth';
		refreshDatabaseSelect: 'refresh-database-select';
		save: 'save-button';
	};
	selects: {
		databaseId: 'database-id';
		nameProperty: 'notion-property-name';
		categoryProperty: 'notion-property-category';
		courseProperty: 'notion-property-course';
		urlProperty: 'notion-property-url';
		pointsProperty: 'notion-property-points';
		availableProperty: 'notion-property-available';
		dueProperty: 'notion-property-due';
		spanProperty: 'notion-property-span';
		categoryCanvas: 'notion-category-canvas';
	};
	elements: {
		advancedOptions: 'advanced-options';
		courseCodesGroup: 'course-code-overrides-group';
		courseEmojisGroup: 'course-emojis-group';
		assignmentTypeEmojisGroup: 'assignment-type-emojis-group'
	};
}

type OptionsRestoreButtonName = keyof OptionsElements['restore'];
type OptionsRestoreButtonId = valueof<OptionsElements['restore']>;
type OptionsButtonName = keyof OptionsElements['buttons'];
type OptionsButtonId = valueof<OptionsElements['buttons']>;
type OptionsSelectId = valueof<OptionsElements['selects']>;
type OptionsElementId = OptionsRestoreButtonId | OptionsButtonId | OptionsSelectId | valueof<OptionsElements['elements']>;

const OptionsPage = <const>{
	async restoreOptions() {
		const savedFields = await Storage.getSavedFields();
		console.log(JSON.stringify(savedFields))

		Object.entries(savedFields).forEach(([field, value]) => {
			const { input, defaultValue } = CONFIGURATION.FIELDS[<keyof typeof savedFields>field];

			input.setValue(value, false);
			input.setPlaceholder?.(defaultValue);
		});

		Object.values(buttons.restore).forEach(button => button.toggle());
	},

	async saveOptions() {
		const fieldEntries = await OptionsPage.getInputs();

		if (!fieldEntries) return;

		await Storage.setSavedFields(fieldEntries);

		buttons.save.setButtonLabel('Saved!');
		buttons.save.resetHTML(1325);

		this.restoreOptions();
	},

	async getInputs(): Promise<Record<keyof SavedFields, SupportedTypes> | null> {
		const fieldEntries = Object.fromEntries(
			await Promise.all(
				Object.entries(CONFIGURATION.FIELDS).map(async ([field, { input }]) => [field, await input.validate(true)]),
			),
		);

		if (Object.values(fieldEntries).every(value => value !== InputFieldValidator.INVALID_INPUT)) return <Record<keyof SavedFields, SupportedTypes>>fieldEntries;

		return null;
	},

	saveEmojiGroups(){
		// var course_ids = Array.prototype.slice.call(document.getElementsByClassName('courses-select') as HTMLCollectionOf<HTMLSelectElement>)
		// 				.map(elem => {
		// 					let childrn = Array.prototype.slice.call(elem.children);
		// 					return childrn.filter((c: any) => c.selected)[0]
		// 				});
		
						// console.log([...document.getElementsByClassName('assignment-group-select') as HTMLCollectionOf<HTMLSelectElement>])

		var emoji_groups = [...document.getElementsByClassName('emoji-group')]
							.map(gp => {
								return {
									name: (gp.getElementsByClassName('group-name')[0] as HTMLInputElement).value,
									emoji: (gp.getElementsByClassName('group-emoji')[0] as HTMLInputElement).value as EmojiRequest,
									assign: [...gp.getElementsByClassName('assignment-group-select') as HTMLCollectionOf<HTMLSelectElement>]
										.map(elem => {
											let childrn = [...elem.children];
											return childrn.filter((c: any) => c.selected)[0]
										}).map(e => e.id.slice(1).split('-').map(cod => parseInt(cod)))
							}
							}
								);
		
		console.log(emoji_groups)
		// var assignment_groups = Array.from(document.getElementsByClassName('assignment-group-select') as HTMLCollectionOf<HTMLSelectElement>)
		// 				.map(elem => {
		// 					let childrn = [...elem.children];
		// 					// let childrnIds = childrn.map(c => c.id);
		// 					// alert(JSON.stringify(childrnIds))
		// 					return childrn.filter((c: any) => c.selected)[0]
		// 				});
		
		// var requiredIds = assignment_groups.map(e => e.id);

		Storage.getSavedAssignments().then(assignmentByCourses => {
			let courses= Object.keys(assignmentByCourses);

			let arrayedAssignmentTypeByCourses = Object.entries(assignmentByCourses).map(
				course => [...new Set(course[1].map(assignment=>assignment.type))]
				);
			// let assignmentTypeByCourses = Object.fromEntries(arrayedAssignmentTypeByCourses)
			
			
			// for (let cours of courses){
			// 	for (let assign of assignmentByCourses[cours]){

			// 	}
			// }

			for (let egroup of emoji_groups){
				for (let ca of egroup['assign']){
					// let course_assign_code = ca.slice(1);
					// var course_assign = course_assign_code.split('-').map(cod => parseInt(cod))
					// console.log(course_assign)
					// console.log(assignmentByCourses[courses[course_assign[0]]])

					assignmentByCourses[courses[ca[0]]] = assignmentByCourses[courses[ca[0]]].map(
						assign => {
							// alert()
							// assign.type= 'null';
							console.log(arrayedAssignmentTypeByCourses[ca[0]],  assign.type, ca[1])
							if (arrayedAssignmentTypeByCourses[ca[0]].indexOf(assign.type) == ca[1])
							assign.icon = egroup['emoji']
							return assign
						}
						)

					// assignmentByCourses[courses[ca[0]]][ca[1]].icon = egroup['emoji'] ? egroup['emoji'] : null


				}

			}
			console.log(assignmentByCourses)
			Storage.setSavedAssignments(assignmentByCourses)
		});
		
	}
};

const AdvancedOptions = <const>{
	elements: Array.from(document.getElementsByClassName('advanced-options'))
		.map((element, index) => Element.getInstance({
			id: element.id || `advanced-options-${index}`,
			type: 'advanced options',
			element,
		})),
	control: CONFIGURATION.FIELDS['options.displayAdvanced'].input,

	show() {
		this.elements.forEach(element => element.show());
	},

	hide() {
		this.elements.forEach(element => element.hide());
	},

	toggle(display?: boolean) {
		(display ?? this.control.getValue())
			? this.show()
			: this.hide();
	},

	dispatchInputEvent() {
		this.control.dispatchInputEvent();
	},
};

const OAuth2Button = <const>{
	button: Button.getInstance<OptionsButtonId>({ id: 'notion-oauth' }),
	states: {
		UNAUTHORISED: 'Authorise with Notion',
		REAUTHORISE: 'Reauthorise with Notion',
		AUTHORISING: 'Authorising with Notion...',
		AUTHORISED: 'Authorised!',
	},
};

const DatabaseSelect = <const>{
	element: Select.getInstance<OptionsSelectId>({
		id: 'database-id',
		Validator: RequiredNotionDatabaseIdField,
	}),
	refreshButton: Button.getInstance<OptionsButtonId>({ id: 'refresh-database-select' }),
	propertySelects: {
		name: PropertySelect.getInstance<OptionsSelectId>({
			id: 'notion-property-name',
			type: 'title',
			Validator: RequiredStringField,
			fieldKey: 'notion.propertyNames.name',
		}),
		category: PropertySelect.getInstance<OptionsSelectId>({
			id: 'notion-property-category',
			type: 'select',
			Validator: StringField,
			fieldKey: 'notion.propertyNames.category',
		}),
		course: PropertySelect.getInstance<OptionsSelectId>({
			id: 'notion-property-course',
			type: 'select',
			Validator: StringField,
			fieldKey: 'notion.propertyNames.course',
		}),
		url: PropertySelect.getInstance<OptionsSelectId>({
			id: 'notion-property-url',
			type: 'url',
			Validator: StringField,
			fieldKey: 'notion.propertyNames.url',
		}),
		points: PropertySelect.getInstance<OptionsSelectId>({
			id: 'notion-property-points',
			type: 'number',
			Validator: StringField,
			fieldKey: 'notion.propertyNames.points',
		}),
		available: PropertySelect.getInstance<OptionsSelectId>({
			id: 'notion-property-available',
			type: 'date',
			Validator: StringField,
			fieldKey: 'notion.propertyNames.available',
		}),
		due: PropertySelect.getInstance<OptionsSelectId>({
			id: 'notion-property-due',
			type: 'date',
			Validator: StringField,
			fieldKey: 'notion.propertyNames.due',
		}),
		span: PropertySelect.getInstance<OptionsSelectId>({
			id: 'notion-property-span',
			type: 'date',
			Validator: StringField,
			fieldKey: 'notion.propertyNames.span',
		}),
	},
	propertyValueSelects: {
		get categoryCanvas() {
			return SelectPropertyValueSelect.getInstance<OptionsSelectId>({
				id: 'notion-category-canvas',
				type: 'select',
				Validator: StringField,
				fieldKey: 'notion.propertyValues.categoryCanvas',
				getDatabaseId: DatabaseSelect.element.getValue.bind(DatabaseSelect.element),
				propertySelect: DatabaseSelect.propertySelects.category,
			});
		},
	},

	show() {
		this.element.show();
		this.refreshButton.show();
	},

	async populate(placeholder = 'Loading') {
		if (!this.element) return;

		const accessToken = (await Storage.getNotionAuthorisation()).accessToken ?? await CONFIGURATION.FIELDS['notion.accessToken'].input.validate(true);

		if (!accessToken || typeof accessToken !== 'string') return;

		this.element.setInnerHTML(`<option selected disabled hidden>${placeholder}...</option>`);

		const notionClient = NotionClient.getInstance({ auth: accessToken });

		const databases = await notionClient.searchShared({
			filter: {
				property: 'object',
				value: 'database',
			},
		}, {
			cache: false,
			force: true,
		});

		const { notion: { databaseId } } = await Storage.getOptions();

		const selectOptions = databases?.results.reduce((html: string, database) => html + `
			<option value='${database.id}' ${(databaseId === database.id) ? 'selected' : ''}>
				${NotionClient.resolveTitle(database) ?? 'Untitled'}
			</option>
			`, '');

		this.element.setInnerHTML(selectOptions ?? '');

		this.element.dispatchInputEvent();
	},
};

const buttons: {
	[K in OptionsButtonName]: Button;
} & {
	restore: {
		[K in OptionsRestoreButtonName]: RestoreDefaultsButton;
	};
} = <const>{
	oauth: OAuth2Button.button,
	refreshDatabaseSelect: DatabaseSelect.refreshButton,
	save: Button.getInstance<OptionsButtonId>({ id: 'save-button' }),
	restore: {
		timeZone: RestoreDefaultsButton.getInstance<OptionsRestoreButtonId>({
			id: 'options-restore-timezone',
			restoreKeys: [
				'timeZone',
			],
		}),
		canvasCourseCodes: RestoreDefaultsButton.getInstance<OptionsRestoreButtonId>({
			id: 'options-restore-canvas-course-codes',
			restoreKeys: [
				'canvas.courseCodeOverrides',
			],
		}),
		notionPropertyNames: RestoreDefaultsButton.getInstance<OptionsRestoreButtonId>({
			id: 'options-restore-notion-property-names',
			restoreKeys: [
				'notion.propertyNames.name',
				'notion.propertyNames.category',
				'notion.propertyNames.course',
				'notion.propertyNames.url',
				'notion.propertyNames.points',
				'notion.propertyNames.available',
				'notion.propertyNames.due',
				'notion.propertyNames.span',
			],
		}),
		notionPropertyValues: RestoreDefaultsButton.getInstance<OptionsRestoreButtonId>({
			id: 'options-restore-notion-property-values',
			restoreKeys: [
				'notion.propertyValues.categoryCanvas',
			],
		}),
		notionEmojis: RestoreDefaultsButton.getInstance<OptionsRestoreButtonId>({
			id: 'options-restore-notion-emojis',
			restoreKeys: [
				'notion.courseEmojis',
			],
		}),
		all: RestoreDefaultsButton.getInstance<OptionsRestoreButtonId>({
			id: 'options-restore-all',
			restoreKeys: <(keyof SavedFields)[]>Object.keys(CONFIGURATION.FIELDS),
		}),
		undo: RestoreSavedButton.getInstance<OptionsRestoreButtonId>({
			id: 'options-undo-all',
			restoreKeys: <(keyof SavedFields)[]>Object.keys(CONFIGURATION.FIELDS),
			restoreOptions: OptionsPage.restoreOptions.bind(OptionsPage),
		}),
	},
};

/*
 *
 * Initial Load
 *
 */

/*
 * Display Theme
 */

Storage.getOptions().then(({ extension: { displayTheme }, options: { displayAdvanced } }) => {
	// set display theme
	if (displayTheme) document.documentElement.classList.add(`${displayTheme}-mode`);

	// show advanced options if appropriate
	AdvancedOptions.toggle(displayAdvanced);
});

/*
 * Toggle Dependents
 */

// toggle dependents if appropriate
Object.values(CONFIGURATION.FIELDS).forEach(({ input, dependents }) => {
	if (!dependents) return;
	input.toggleDependents(dependents);
});

/*
 * OAuth
 */

if (!OAuth2.isIdentitySupported) {
	buttons.oauth.hide();
	CONFIGURATION.FIELDS['notion.accessToken'].input.show();
}

Storage.getNotionAuthorisation().then(async ({ accessToken }) => {
	if (!accessToken || !await NotionClient.getInstance({ auth: accessToken }).validateToken()) {
		buttons.oauth.setDefaultLabel(OAuth2Button.states.UNAUTHORISED);
		return buttons.oauth.resetHTML();
	}

	buttons.oauth.setDefaultLabel(OAuth2Button.states.REAUTHORISE);
	buttons.oauth.resetHTML();

	DatabaseSelect.populate();
	DatabaseSelect.show();
});

/*
 * DOMContentLoaded
 */

document.addEventListener('DOMContentLoaded', async () => {
	KeyValueGroup.getInstance<OptionsElementId>({ id: 'course-code-overrides-group' })
		.setPlaceholders({
			key: '121 UoA',
			value: 'COURSE 121',
		});

	KeyValueGroup.getInstance<OptionsElementId>({ id: 'course-emojis-group' })
		.setPlaceholders({
			key: 'COURSE 121',
			value: '👨‍💻',
		})
		.setValueValidator(EmojiField)
		.setValueValidateOn('input');
	
	

	await OptionsPage.restoreOptions();

	Object.values(buttons.restore).forEach(button => button.toggle());
});

// radio button hidding/unhidding sections
document.getElementById("emoji-sel-course")?.addEventListener('click', function (event) {
	if (event !== null && event.target !== null){
		const element = event.target as HTMLElement;
		if (event.target  && element.matches("input[type='radio']")) {
			document.getElementById("emoji-groups-assignment-type")!.style.display = "none";
			document.getElementById("emoji-groups-course")!.style.display = "block";
		}
}
});

document.getElementById("emoji-sel-assignment-group")?.addEventListener('click', function (event) {
	if (event !== null && event.target !== null){
		const element = event.target as HTMLElement;
		if (event.target  && element.matches("input[type='radio']")) {
			document.getElementById("emoji-groups-course")!.style.display = "none";
			document.getElementById("emoji-groups-assignment-type")!.style.display = "block";
		}
}
});



// var assignmentGroups

Storage.getSavedAssignments().then(assignmentByCourses => {
	let arrayedAssignmentTypeByCourses = Object.entries(assignmentByCourses).map(
		course => [course[0], [...new Set(course[1].map(assignment=>assignment.type))]]
		);
		
	// let assignmentTypeByCourses = arrayedAssignmentTypeByCourses.reduce(
	// 	(o, key) => ({ ...o, [(key[0] as string)]: key[1]}), {}
	// 	);
			
	var coursesHTML = arrayedAssignmentTypeByCourses.map(
		(course, i) => `<option value='${i}'>${course[0]}</option>`
		);

	var arrayedAssignmentGroupsHTML = arrayedAssignmentTypeByCourses.map(
		(course, i) => <Array<string>>(course[1] as Array<string>).map((types, ii) => `<option id='a${i}-${ii}' value='${i}'>${types}</option>`)
		);
	var assignmentGroupsHTML = arrayedAssignmentGroupsHTML.flat()
		// localStorage.setItem("courses", JSON.stringify(courses));
	// let array_optionHTML = Object.values(assignmentTypeByCourses);
	
	console.log(assignmentGroupsHTML)
	console.log(assignmentGroupsHTML.join(''))

	const assigroupHTML = `
	<div id="assignment-group-countainer" style="display: flex; flex-direction:row; justify-content: space-between;">
		<select style="flex:2; margin-right: 10px" name="courses" class="courses-select">
		<option value="" selected disabled hidden>Course</option>
		${coursesHTML.join('')}
		</select>
		<select style="flex:2; margin-right: 10px" name="assignment-group" class="assignment-group-select">
		<option value="" selected disabled hidden>Assignment Group</option>
		${assignmentGroupsHTML.join('')}
		</select>
		<button type='reset' id='remove-assign-type' style="flex:0.3;" class='button red hover row'>X</button>
	</div>`
	
	const emojigroupHTML = `
	<div style="display: flex; flex-direction: column; border:1px" class="emoji-group">
		<div style="display: flex; flex-direction: row; justify-content: space-between;">
			<input class="group-name" placeholder="Group Name eg. Quizzes" style="margin-right: 10px"> 
			<input class="group-emoji" placeholder="Insert emoji" style="margin-right:10px">
			<button type='reset' id='remove-emoji-group' class='button red hover row'>Remove Group</button>
		</div>
		<div id="assignment-groups-container" style="display: flex; flex-direction: column;">
			${assigroupHTML}
		</div>
		<button type='button' id='add-assignment-group' class='button green hover row'>Add an Assignment Group</button>
	</div>  `
	
	// var removeAssignmentGroupButton = document.getElementById("remove-assign-types")
	
	var inputSelectsDOM = document.createElement("input");
	inputSelectsDOM.innerHTML = assignmentGroupsHTML.join('');
	var inputSelectsDOMChildren = inputSelectsDOM.children;


	const performSep = (element: HTMLSelectElement) => {
		(element.nextElementSibling)!.innerHTML = ([... inputSelectsDOMChildren] as Array<HTMLInputElement>).filter(
			(o) => element.value.includes(o.value)
		  ).map(o => o.outerHTML).join('')
	}

	document.addEventListener('change', event => {
		const element = event.target as HTMLSelectElement;
		if (event != null)
		switch (element!.className) {
			case 'courses-select':
				(element.nextElementSibling)!.innerHTML = ([... inputSelectsDOMChildren] as Array<HTMLInputElement>).filter(
					(o) => element.value.includes(o.value)
				  ).map(o => o.outerHTML).join('')
				break;

			case 'assignment-group-select':
				// console.log(element.options[element.options.selectedIndex].id)
				// removes the selected option from future uses
				console.log(([...inputSelectsDOMChildren] as Array<HTMLInputElement>).filter(elem => elem.id != element.options[element.options.selectedIndex].id).map(elem => elem.outerHTML).join(''))
				let optionsElem = ([...inputSelectsDOMChildren] as Array<HTMLInputElement>).filter(elem => elem.id != element.options[element.options.selectedIndex].id).map(elem => elem.outerHTML).join('')

				var _inputSelectsDOM = document.createElement("input");
				_inputSelectsDOM.innerHTML = optionsElem;
				inputSelectsDOMChildren = _inputSelectsDOM.children;

				// removes selected option from past dropdowns
				var otherSelects = document.getElementsByClassName('assignment-group-select');
				for (let n of otherSelects as HTMLCollectionOf<HTMLSelectElement>) {
					if (n != element && n.value == element.value){
						let alreadySelected;
						for (let c of n.children as HTMLCollectionOf<HTMLOptionElement>){
							console.log(c)
							if (c.id == element.options[element.options.selectedIndex].id)
								c.value = 'X';
							if (c.selected == true){
								alreadySelected = c.id
							}
							}
						// alert(alreadySelected);

						(n)!.innerHTML = ([... n.children] as Array<HTMLInputElement>).filter(
							(o) => element.value.includes(o.value)
							).map(o => o.outerHTML).join('');
						
						for (let c of n.children as HTMLCollectionOf<HTMLOptionElement>){
							if (c.id == alreadySelected){
							c.selected = true;
							// alert(c.id)
							}
						}
					}
				}

				// addes the old option to past dropdowns

				// adds the old option for future uses


				break;
		}
	})

	document.addEventListener('click', function (event) {
		const element = event.target as HTMLElement;
		if (event != null)
			switch (element!.id) {
				case 'add-assignment-group':
					(element.previousElementSibling)!.insertAdjacentHTML('beforeend', assigroupHTML);
					break;
				case 'add-emoji-group':
					(element.previousElementSibling)!.insertAdjacentHTML('beforeend', emojigroupHTML);
					break;
				case 'remove-assign-type':
					// OptionsPage.saveEmojiGroups();
					element.parentElement?.remove();
					break;
				case 'remove-emoji-group':
					element.parentElement?.parentElement?.remove();
					break;
				case 'save-emoji':
					alert()
					OptionsPage.saveEmojiGroups()
					break;
			}
	});
})
			
			
/*
 * Warn If Unsaved Changes on Exit
 */

window.addEventListener('beforeunload', event => {
	if (buttons.restore.undo.isSelfHidden) return;

	event.preventDefault();
	return event.returnValue = 'Changes you made may not be saved.';
});

/*
 *
 * Input Listeners
 *
 */

// add event listener to display theme toggle
CONFIGURATION.FIELDS['extension.displayTheme'].input.addEventListener('input', () => {
	const displayTheme = CONFIGURATION.FIELDS['extension.displayTheme'].input.getValue();

	document.documentElement.classList.forEach(token => {
		if (!/-mode/.test(token)) return;
		document.documentElement.classList.remove(token);
	});

	if (!displayTheme) return;

	document.documentElement.classList.add(`${displayTheme}-mode`);
});

// add event listener to advanced options toggle
AdvancedOptions.control?.addEventListener('input', AdvancedOptions.toggle.bind(AdvancedOptions, undefined));

// add event listener to bind accessToken input field to authorisation button
CONFIGURATION.FIELDS['notion.accessToken'].input.addEventListener('input', async () => {
	const validatedInput = await CONFIGURATION.FIELDS['notion.accessToken'].input.validate();

	if (validatedInput === InputFieldValidator.INVALID_INPUT) {
		buttons.oauth.setDefaultLabel(OAuth2Button.states.UNAUTHORISED);
		return buttons.oauth.resetHTML();
	}

	DatabaseSelect.populate();

	buttons.oauth.setDefaultLabel(OAuth2Button.states.REAUTHORISE);

	if (buttons.oauth.getButtonLabel() !== OAuth2Button.states.AUTHORISING) {
		return buttons.oauth.resetHTML();
	}

	buttons.oauth.setButtonLabel(OAuth2Button.states.AUTHORISED);
	buttons.oauth.resetHTML(1325);
});

// validate fields on input
Object.values(CONFIGURATION.FIELDS)
	.forEach(({ input, validateOn = 'input', dependents = [] }) => {
		input.addEventListener(validateOn, input.validate.bind(input, undefined));

		if (!dependents.length) return;

		input.addEventListener('input', input.toggleDependents.bind(input, dependents));
	});

Object.values(buttons.restore).forEach(button => button.addEventListener('click', button.restore.bind(button)));

DatabaseSelect.element.addEventListener('input', async () => {
	const databaseId = DatabaseSelect.element.getValue();
	if (!typeGuards.isUUIDv4(databaseId)) return;

	const accessToken = (await Storage.getNotionAuthorisation()).accessToken ?? await CONFIGURATION.FIELDS['notion.accessToken'].input.validate(true);

	if (!accessToken || typeof accessToken !== 'string') return;

	const databasePromise = NotionClient.getInstance({ auth: accessToken }).retrieveDatabase(databaseId);

	[
		...Object.values(DatabaseSelect.propertySelects),
		...Object.values(DatabaseSelect.propertyValueSelects),
	]
		.forEach(select => select.populate(databasePromise));
});

buttons.oauth.addEventListener('click', async () => {
	if (!OAuth2.isIdentitySupported) return;

	buttons.oauth.setButtonLabel(OAuth2Button.states.AUTHORISING);

	const success = await OAuth2.authorise();

	if (!success) return buttons.oauth.resetHTML();

	const { accessToken } = await Storage.getNotionAuthorisation();
	CONFIGURATION.FIELDS['notion.accessToken'].input.setValue(accessToken ?? null);
});

buttons.refreshDatabaseSelect.addEventListener('click', async () => {
	buttons.refreshDatabaseSelect.setButtonLabel('Refreshing...');

	await DatabaseSelect.populate('Refreshing');

	buttons.refreshDatabaseSelect.setButtonLabel('Refreshed!');
	buttons.refreshDatabaseSelect.resetHTML(1325);
});

buttons.save.addEventListener('click', OptionsPage.saveOptions.bind(OptionsPage));

document.addEventListener('keydown', keyEvent => {
	if (!keyEvent.ctrlKey || keyEvent.key !== 's') return;

	keyEvent.preventDefault();
	OptionsPage.saveOptions();
});

/*
 *
 * Konami
 *
 */

const Konami = {
	pattern: <const>['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'],
	currentIndex: 0,

	handler(event: KeyboardEvent) {
		if (!(<readonly string[]>this.pattern).includes(event.key) || event.key !== this.pattern[this.currentIndex]) {
			return this.currentIndex = 0;
		}

		this.currentIndex++;

		if (this.currentIndex !== this.pattern.length) return;

		this.currentIndex = 0;
		AdvancedOptions.control.setValue(true);
	},
};

document.addEventListener('keydown', event => Konami.handler(event), false);

// ! alert for removal of status select property support
Storage.getStorageKey('notion.propertyNames.status', false).then(value => {
	if (value === false) return;

	const deleteProperty = confirm('Prior support for a \'Status\' Notion property has been removed.\n\nPlease update your database to use the newly-released Notion built-in Status property.\n\nFor more information, visit the GitHub Repository.\n\nClick \'OK\' to hide this message forever.');

	if (!deleteProperty) return;

	Storage.clearStorageKey('notion.propertyNames.status');
});
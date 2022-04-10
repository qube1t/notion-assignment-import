import { CreatePageParameters, QueryDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';
import { EmojiRequest, NotionHandler } from '../api-handlers/notion';
import { ParsedAssignment, SavedAssignments } from './parse';

import { valueof, ArrayElement } from '../types/utils';

export async function exportToNotion(): Promise<void | ParsedAssignment[]> {
	const options = await chrome.storage.local.get({
		'timezone': 'Pacific/Auckland',
		'notion.propertyNames.name': 'Name',
		'notion.propertyNames.category': 'Category',
		'notion.propertyNames.course': 'Course',
		'notion.propertyNames.url': 'URL',
		'notion.propertyNames.status': 'Status',
		'notion.propertyNames.available': 'Reminder',
		'notion.propertyNames.due': 'Due',
		'notion.propertyNames.span': 'Date Span',
		'notion.propertyValues.categoryCanvas': 'Canvas',
		'notion.propertyValues.statusToDo': 'To Do',
	});

	const CONSTANTS = {
		TIMEZONE: options['timezone'] || null,
		PROPERTY_NAMES: {
			NAME: options['notion.propertyNames.name'] || null,
			CATEGORY: options['notion.propertyNames.category'] || null,
			COURSE: options['notion.propertyNames.course'] || null,
			URL: options['notion.propertyNames.url'] || null,
			STATUS: options['notion.propertyNames.status'] || null,
			AVAIALBLE: options['notion.propertyNames.available'] || null,
			DUE: options['notion.propertyNames.due'] || null,
			SPAN: options['notion.propertyNames.span'] || null,
		},
		PROPERTY_VALUES: {
			CATEGORY_CANVAS: options['notion.propertyValues.categoryCanvas'] || null,
			STATUS_TO_DO: options['notion.propertyValues.statusToDo'] || null,
		},
	};

	class SavedAssignment implements ParsedAssignment {
		private assignment: ParsedAssignment;

		public constructor(assignment: ParsedAssignment) {
			this.assignment = assignment;
		}

		public get name(): string {
			return this.assignment.name;
		}

		public get course(): string {
			return this.assignment.course;
		}

		public get icon(): EmojiRequest | null {
			return this.assignment.icon;
		}

		public get url(): string {
			return this.assignment.url;
		}

		public get available(): string {
			return this.assignment.available;
		}

		public get due(): string {
			return this.assignment.due;
		}

		private static verifySelectValue(value: string | null): Extract<valueof<CreatePageParameters['properties']>, { type?: 'select'; }>['select'] {
			return (value)
				? {
					name: value,
				}
				: null;
		}

		public notionPageParameters(databaseId: string): CreatePageParameters {
			const _properties: CreatePageParameters['properties'] = {
				[CONSTANTS.PROPERTY_NAMES.NAME ?? '']: {
					title: [
						{
							text: {
								content: this.name,
							},
						},
					],
				},
				[CONSTANTS.PROPERTY_NAMES.CATEGORY ?? '']: {
					select: SavedAssignment.verifySelectValue(CONSTANTS.PROPERTY_VALUES.CATEGORY_CANVAS),
				},
				[CONSTANTS.PROPERTY_NAMES.COURSE ?? '']: {
					select: {
						name: this.course,
					},
				},
				[CONSTANTS.PROPERTY_NAMES.URL ?? '']: {
					url: this.url,
				},
				[CONSTANTS.PROPERTY_NAMES.STATUS ?? '']: {
					select: SavedAssignment.verifySelectValue(CONSTANTS.PROPERTY_VALUES.STATUS_TO_DO),
				},
				[CONSTANTS.PROPERTY_NAMES.AVAIALBLE ?? '']: {
					date: {
						start: this.available,
						time_zone: CONSTANTS.TIMEZONE,
					},
				},
				[CONSTANTS.PROPERTY_NAMES.DUE ?? '']: {
					date: {
						start: this.due,
						time_zone: CONSTANTS.TIMEZONE,
					},
				},
				[CONSTANTS.PROPERTY_NAMES.SPAN ?? '']: {
					date: {
						start: this.available,
						end: this.due,
						time_zone: CONSTANTS.TIMEZONE,
					},
				},
			};

			return {
				parent: {
					type: 'database_id',
					database_id: databaseId,
				},
				properties: Object.fromEntries(Object.entries(_properties).filter(([propertyName]) => propertyName !== '')),
				icon: (this.icon)
					? {
						emoji: this.icon,
					}
					: null,
			};
		}
	}

	class NotionAssignment {
		private assignment: ArrayElement<QueryDatabaseResponse['results']>;

		public constructor(assignment: ArrayElement<QueryDatabaseResponse['results']>) {
			this.assignment = assignment;
		}

		public get name(): string {
			return ('properties' in this.assignment && 'title' in this.assignment.properties.Name) ? this.assignment.properties.Name.title.map(({ plain_text }) => plain_text).join('') : '';
		}

		public get course(): string | undefined {
			if (!CONSTANTS.PROPERTY_NAMES.COURSE) return undefined;

			if ('properties' in this.assignment && CONSTANTS.PROPERTY_NAMES.COURSE in this.assignment.properties) {
				// Extract the course property from the page
				const courseProperty = this.assignment.properties[CONSTANTS.PROPERTY_NAMES.COURSE];

				// If the course property is a select property, return its name
				if ('select' in courseProperty) return courseProperty.select?.name;
			}

			// Return undefined if no select was found
			return undefined;
		}

		public get url(): string | undefined {
			if (!CONSTANTS.PROPERTY_NAMES.URL) return undefined;

			if ('properties' in this.assignment && CONSTANTS.PROPERTY_NAMES.URL in this.assignment.properties) {
				const urlProperty = this.assignment.properties[CONSTANTS.PROPERTY_NAMES.URL];

				if ('url' in urlProperty && urlProperty?.url) return urlProperty.url;
			}

			return undefined;
		}
	}

	async function getNewAssignments(databaseId: string): Promise<SavedAssignment[]> {
		async function getSavedAssignments(): Promise<SavedAssignment[]> {
			const { savedAssignments } = <{ savedAssignments: SavedAssignments; }>await chrome.storage.local.get({ savedAssignments: {} });

			return Object.values(savedAssignments)
				.flat()
				.map(assignment => new SavedAssignment(assignment))
				.filter(assignment => Date.parse(assignment.due) > Date.now());
		}

		async function queryNotionAssignments(): Promise<void | NotionAssignment[]> {
			const filterForCanvasAssignments = (CONSTANTS.PROPERTY_NAMES.CATEGORY)
				? {
					property: CONSTANTS.PROPERTY_NAMES.CATEGORY,
					select: (CONSTANTS.PROPERTY_VALUES.CATEGORY_CANVAS)
						? {
							equals: CONSTANTS.PROPERTY_VALUES.CATEGORY_CANVAS,
						}
						: {
							is_empty: <const>true,
						},
				}
				: undefined;

			const notionAssignments = await notionHandler.queryDatabase(databaseId, filterForCanvasAssignments);

			return notionAssignments?.results?.map(assignment => new NotionAssignment(assignment));
		}

		const savedAssignments = await getSavedAssignments();
		const notionAssignments = await queryNotionAssignments();

		if (!notionAssignments?.length) return savedAssignments;

		return savedAssignments.filter(assignment => !notionAssignments.some(page => page.url === assignment.url));
	}

	// Set up Notion API handler

	const { 'notion.notionKey': NOTION_KEY, 'notion.databaseId': DATABASE_ID } = await chrome.storage.local.get(['notion.notionKey', 'notion.databaseId']);

	if (!NOTION_KEY || !DATABASE_ID) return alert('Invalid Notion Integration Key or Database ID.\n\nRefer to the extension set-up instructions on GitHub for more information.');

	const notionHandler = new NotionHandler({ auth: NOTION_KEY });

	// Create assignments

	const assignments = await getNewAssignments(DATABASE_ID);
	let errorCount = 0;

	const createdAssignments = await Promise.all(
		assignments.map(async assignment => {
			const page = await notionHandler.createPage(assignment.notionPageParameters(DATABASE_ID));

			if (page) {
				console.log(`Created assignment ${assignment.course} ${assignment.name}`);
				return [assignment];
			}

			else {
				console.error(`Error creating assignment ${assignment.course} ${assignment.name}`);
				errorCount++;
				return [];
			}
		}),
	);

	if (errorCount) alert(`An error was encountered when creating ${errorCount} assignments.`);

	return createdAssignments.flat();
}
export interface ClickUpTask {
	id: string;
	name: string;
	description: string;
	status: {
		status: string;
		type: string;
	};
	assignees: Array<{ id: number; username: string; email: string }>;
	tags: Array<{ name: string; tag_fg: string; tag_bg: string }>;
	url: string;
	list?: {
		id: string;
		name: string;
	};
	custom_fields?: Array<{
		id: string;
		name: string;
		// biome-ignore lint/suspicious/noExplicitAny: any needed for dynamic custom field values
		value: any;
	}>;
	priority?: {
		id: string;
		priority: string;
		color: string;
	};
	attachments?: Array<{
		id: string;
		title: string;
		url: string;
	}>;
}

export interface ClickUpList {
	id: string;
	name: string;
	statuses: Array<{
		status: string;
		type: string;
		orderindex: number;
	}>;
}

export interface ClickUpSpace {
	id: string;
	name: string;
}

export interface ClickUpUser {
	id: number;
	username: string;
	email: string;
}

export interface ClickUpComment {
	id: string;
	comment_text: string;
	user: {
		id: number;
		username: string;
	};
	date: string;
}

export interface CreateTaskPayload {
	name: string;
	description?: string;
	status?: string;
	assignees?: number[];
	tags?: string[];
	priority?: number;
	parent?: string;
	custom_fields?: Array<{
		id: string;
		// biome-ignore lint/suspicious/noExplicitAny: any needed for dynamic custom field values
		value: any;
	}>;
}

export interface UpdateTaskPayload {
	name?: string;
	description?: string;
	status?: string;
	assignees?: {
		add?: number[];
		rem?: number[];
	};
	tags?: string[];
	priority?: number;
	custom_item_id?: number; // Task type
}

export interface ClickUpMigrationResult {
	success: boolean;
	jiraKey: string;
	clickupUrl?: string;
	clickupId?: string;
	error?: string;
	wasUpdate?: boolean;
}

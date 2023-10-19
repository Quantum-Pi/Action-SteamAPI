export enum PersonaState {
	Offline = 0,
	Online = 1,
	Busy = 2,
	Away = 3,
	Snooze = 5
}

export interface GetPlayerSummaries {
	players: {
		steamid: string;
		personaname: string;
		profileurl: string;
		avatar: string;
		avatarmedium: string;
		avatarfull: string;
		personastate: PersonaState;
		communityvisibilitystate: any;
		profilestate: 0 | 1; // TODO 1 means optional are true
		lastlogoff: string;
		commentpermission: 0 | 1;
		realname?: string;
		primaryclanid?: string;
		timecreated?: string;
		gameid?: string;
		gameserverip?: string;
		gameextrainfo?: string;
		loccountrycode?: string;
		locstatecode?: string;
		loccityid?: any;
	}[];
}

export type GetFriendList = {
	steamid: string;
	relationship: string;
	friend_since: number;
}[];

export interface GetPlayerAchievements {
	steamID: string;
	gameName: string;
	achievements: {
		apiname: string;
		achieved: 0 | 1;
		unlocktime: number;
		name?: string;
		description?: string;
	}[];
}

export interface GetPlayerAchievementsWithPercent {
	steamID: string;
	gameName: string;
	achievements: {
		apiname: string;
		achieved: 0 | 1;
		unlocktime: number;
		name?: string;
		description?: string;
		percent?: number;
	}[];
}

export interface GetOwnedGames {
	game_count: number;
	games: {
		appid: number;
		name: number;
		playtime_2weeks?: number;
		playtime_forever: number;
		img_icon_url: string;
		has_community_visible_stats?: boolean;
		rtime_last_played: number;
		has_leaderboards?: boolean;
	}[];
}
export type GetRecentlyPlayedGames = GetOwnedGames;

export type GetGlobalAchievementPercentagesForApp = {
	name: string;
	percent: number;
}[];

export interface GetSchemaForGame {
	gameName: string;
	gameVersion: string;
	availableGameStats: {
		achievements: {
			name: string;
			defaultvalue: number;
			displayName: string;
			hidden: number;
			icon: string;
			icongray: string;
		}[];
		stats: {
			name: string;
			defaultvalue: number;
			displayName: string;
		}[];
	};
}

export interface SteamBadge {
	badgeid: number;
	level: number;
	completion_time: number;
	xp: number;
	scarcity: number;
}

export interface CommunityBadge extends SteamBadge {
	appid: number;
	communityid: string;
	border_color: number;
}

export const isCommunityBadge = (v: any): v is CommunityBadge => {
	const temp = v as CommunityBadge;
	if (temp.communityid) return true;
	return false;
};

export interface GetBadges {
	badges: (SteamBadge | CommunityBadge)[];
	player_xp: number;
	player_level: number;
	player_xp_needed_to_level_up: number;
	player_xp_needed_current_level: number;
}

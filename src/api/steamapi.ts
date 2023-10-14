import {
	GetBadges,
	GetFriendList,
	GetGlobalAchievementPercentagesForApp,
	GetOwnedGames,
	GetPlayerAchievements,
	GetPlayerSummaries,
	GetRecentlyPlayedGames
} from './types';

type Params = { [key: string]: string | number };

export default class SteamAPI {
	constructor(private apiKey: string) {}

	private getRoute(route: string, params: Params): string {
		params['key'] = this.apiKey;
		return `http://api.steampowered.com/${route}/?${Object.entries(params)
			.map(([key, value]) => `${key}=${value}`)
			.join('&')}`;
	}

	private async apiFetch(endpoint: string, params: Params): Promise<any> {
		const res = await fetch(this.getRoute(endpoint, params));
		if (!res.ok) {
			return new Error(`${res.status}: ${res.statusText}`, { cause: await res.text() });
		}
		return await res.json();
	}

	/**
	 * Returns basic profile information for a list of 64-bit Steam IDs.
	 * @param steamids List of 64 bit Steam IDs to return profile information for. Up to 100 Steam IDs can be requested.
	 * @returns
	 */
	async GetPlayerSummaries(steamids: string[]): Promise<GetPlayerSummaries> {
		return (await this.apiFetch('ISteamUser/GetPlayerSummaries/v0002', { steamids: steamids.join(',') })).response as GetPlayerSummaries;
	}

	/**
	 * Returns the friend list of any Steam user, provided their Steam Community profile visibility is set to "Public".
	 * @param steamid 64 bit Steam ID to return friend list for.
	 * @returns
	 */
	async GetFriendList(steamid: string): Promise<GetFriendList> {
		return (await this.apiFetch('ISteamUser/GetFriendList/v0001', { steamid, relationship: 'all' })).friendslist.friends as GetFriendList;
	}

	/**
	 * Returns a list of achievements for this user by app id
	 * @param steamid 64 bit Steam ID to return friend list for.
	 * @param appid The ID for the game you're requesting
	 * @param lang Language. If specified, it will return language data for the requested language. Default: English
	 * @returns
	 */
	async GetPlayerAchievements(steamid: string, appid: number, lang = 'en'): Promise<GetPlayerAchievements> {
		return (await this.apiFetch('ISteamUserStats/GetPlayerAchievements/v0001', { steamid, appid, lang })).playerstats as GetPlayerAchievements;
	}

	/**
	 * GetOwnedGames returns a list of games a player owns along with some playtime information, if the profile is publicly visible. Private, friends-only, and other privacy settings are not supported unless you are asking for your own personal details (ie the WebAPI key you are using is linked to the steamid you are requesting).
	 * @param steamid The SteamID of the account.
	 * @returns
	 */
	async GetOwnedGames(steamid: string): Promise<GetOwnedGames> {
		return (await this.apiFetch('IPlayerService/GetOwnedGames/v0001', { steamid, include_appinfo: 'true', include_played_free_games: 'true' }))
			.response as GetOwnedGames;
	}

	/**
	 * GetRecentlyPlayedGames returns a list of games a player has played in the last two weeks, if the profile is publicly visible. Private, friends-only, and other privacy settings are not supported unless you are asking for your own personal details (ie the WebAPI key you are using is linked to the steamid you are requesting).
	 * @param steamid The SteamID of the account.
	 * @returns
	 */
	async GetRecentlyPlayedGames(steamid: string): Promise<GetRecentlyPlayedGames> {
		return (await this.apiFetch('IPlayerService/GetRecentlyPlayedGames/v0001', { steamid, include_appinfo: 'true', include_played_free_games: 'true' }))
			.response.games as GetRecentlyPlayedGames;
	}

	/**
	 * Returns on global achievements overview of a specific game in percentages.
	 * @param gameid AppID of the game you want the news of.
	 * @returns
	 */
	async GetGlobalAchievementPercentagesForApp(gameid: number): Promise<GetGlobalAchievementPercentagesForApp> {
		return (
			(await this.apiFetch('ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002', { gameid })).achievementpercentages?.achievements ??
			([] as GetGlobalAchievementPercentagesForApp)
		);
	}

	/**
	 * Returns the Steam Level of a user
	 * @param steamid The SteamID of the account.
	 * @returns
	 */
	async GetSteamLevel(steamid: string): Promise<number> {
		return (await this.apiFetch('IPlayerService/GetSteamLevel/v1', { steamid })).response.player_level as number;
	}

	/**
	 * Gets badges that are owned by a specific user
	 * @param steamid The SteamID of the account.
	 * @returns
	 */
	async GetBadges(steamid: string): Promise<GetBadges> {
		return (await this.apiFetch('IPlayerService/GetBadges/v1', { steamid })).response as GetBadges;
	}
}

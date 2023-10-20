import * as core from '@actions/core';
import SteamAPI from './api/steamapi';
import { GetPlayerAchievements, isCommunityBadge } from './api/types';

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
	try {
		const apiKey: string = core.getInput('apikey');
		const steamid: string = core.getInput('steamid');

		const api = new SteamAPI(apiKey);

		const rawUser = (await api.GetPlayerSummaries([steamid])).players[0];
		const level = await api.GetSteamLevel(steamid);
		const badges = await api.GetBadges(steamid);

		const rawGames = (await api.GetOwnedGames(steamid)).games.map(game => ({
			appid: game.appid,
			name: game.name,
			playtime: game.playtime_forever,
			playtime_2weeks: game.playtime_2weeks,
			last_played: game.rtime_last_played,
			icon_url: game.img_icon_url
		}));

		const achievements = (
			await Promise.all(
				rawGames.map(async (game, i) => {
					await new Promise(res => setTimeout(res, i * 125));
					const playerAchievements = await api.GetPlayerAchievements(steamid, game.appid);
					if (!playerAchievements || !playerAchievements.achievements) return null;

					// Get the achievement global percentages and convert them to an object with schema {[apiname]: percent}
					const percents = (await api.GetGlobalAchievementPercentagesForApp(game.appid)).reduce(
						(prev, { name, percent }) => ({ ...prev, [name]: Math.round(percent * 10 ** 1) / 10 ** 1 }),
						{} as { [key: string]: number }
					);
					// Get the achievement icons and convert them to an object with schema {[apiname]: {icons, hidden}}
					const achievementIcons = (await api.GetSchemaForGame(game.appid)).availableGameStats.achievements.reduce(
						(prev, { icon, icongray, name, hidden }) => ({ ...prev, [name]: { icon, icongray, hidden } }),
						{} as { [key: string]: { icon: string; icongray: string; hidden: number } }
					);
					return {
						...playerAchievements,
						appid: game.appid,
						num_achievements: playerAchievements.achievements.length,
						// Update the original achievements to also contain the percentages and icons
						// Filter by only unlocked achievements
						achievements: playerAchievements.achievements
							.map(ach => {
								return {
									...ach,
									name: ach.name?.replace(/"/g, "'"),
									description: ach.description?.replace(/"/g, "'"),
									percent: percents[ach.apiname],
									...achievementIcons[ach.apiname]
								};
							})
							.filter(ach => ach.achieved)
					};
				})
			)
		)
			// Convert the data so it can be indexed by appid
			.reduce(
				(prev, curr) => {
					if (!curr) return prev;
					return {
						...prev,
						[curr.appid]: {
							achievements: curr.achievements,
							num_achievements: curr.num_achievements
						}
					};
				},
				{} as {
					[key: string]: {
						achievements: GetPlayerAchievements['achievements'];
						num_achievements: number;
					};
				}
			);

		const games = rawGames.map(game => ({ ...game, ...achievements[game.appid] }));

		const friendIds = (await api.GetFriendList(steamid)).reduce(
			(prev, { steamid, friend_since }) => ({ ...prev, [steamid]: friend_since }),
			{} as { [key: string]: number }
		);
		const friends = (await api.GetPlayerSummaries(Object.keys(friendIds))).players.map(friend => ({
			steamid: friend.steamid,
			avatar: friend.avatarfull,
			lastlogoff: friend.lastlogoff,
			username: friend.personaname.replace(/"/g, "'"),
			friend_since: friendIds[friend.steamid]
		}));

		const user = {
			steamid: rawUser.steamid,
			avatar: rawUser.avatarfull,
			lastlogoff: rawUser.lastlogoff,
			username: rawUser.personaname,
			level,
			badges: badges.badges.map(rawBadge => {
				const isCommunity = isCommunityBadge(rawBadge);
				return {
					badgeid: rawBadge.badgeid,
					completion_time: rawBadge.completion_time,
					level: rawBadge.level,
					scarcity: rawBadge.scarcity,
					communityid: isCommunity ? rawBadge.communityid : null,
					appid: isCommunity ? rawBadge.appid : null
				};
			}),
			games,
			friends
		};

		const json = JSON.stringify(user)
			.replace(/\\/g, '')
			.replace(/('|\$|\(|\)|"|!)/g, '\\$1')
			// eslint-disable-next-line no-control-regex
			.replace(/[^\x00-\x7F]/g, '')
			.replaceAll('https://avatars.steamstatic.com/', '')
			.replace(/https:\/\/steamcdn-a\.akamaihd\.net\/steamcommunity\/public\/images\/apps\/[0-9]*\//g, '');

		core.setOutput(
			'json',
			`export interface Profile {
	steamid: string;
	avatar: string;
	lastlogoff: number;
	username: string;
	level: number;
	badges: {
		badgeid: number;
		completion_time: number;
		level: number;
		scarcity: number;
		communityid: number | null;
		appid: number | null;
	}[];
	games: {
		appid: number;
		name: string;
		playtime: number;
		playtime_2weeks?: number;
		last_played: number;
		icon_url: string;
		achievements?: {
			apiname: string;
			achieved: number;
			unlocktime: number;
			name: string;
			description: string;
			percent: number;
			icon: string;
			icongray: string;
			hidden: number;
		}[];
		num_achievements?: number;
	}[];
	friends: {
		steamid: string;
		avatar: string;
		lastlogoff?: number;
		username: string;
		friend_since: number;
	}[];
};
export const profile: Profile = ${json};`
		);
	} catch (error) {
		// Fail the workflow run if an error occurs
		if (error instanceof Error) core.setFailed(error.message);
	}
}

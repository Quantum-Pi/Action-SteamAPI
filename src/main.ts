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
					await new Promise(res => setTimeout(res, i * 100));
					const playerAchievements = await api.GetPlayerAchievements(steamid, game.appid);
					if (!playerAchievements || !playerAchievements.achievements) return null;
					const percents = (await api.GetGlobalAchievementPercentagesForApp(game.appid)).reduce(
						(prev, { name, percent }) => ({ ...prev, [name]: Math.round(percent * 10 ** 1) / 10 ** 1 }),
						{} as { [key: string]: number }
					);
					return {
						...playerAchievements,
						appid: game.appid,
						num_achievements: playerAchievements.achievements.length,
						achievements: playerAchievements.achievements
							.map(ach => {
								return { ...ach, percent: percents[ach.apiname] };
							})
							.filter(ach => ach.achieved)
					};
				})
			)
		).reduce(
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
			username: friend.personaname,
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

		core.setOutput('json', JSON.stringify(user).replace(/'/g, "\\'"));
	} catch (error) {
		// Fail the workflow run if an error occurs
		if (error instanceof Error) core.setFailed(error.message);
	}
}

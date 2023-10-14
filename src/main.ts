import * as core from '@actions/core';
import SteamAPI from './api/steamapi';

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
	try {
		const apiKey: string = core.getInput('apikey');
		const steamid: string = core.getInput('steamid');

		const api = new SteamAPI(apiKey);

		const user = (await api.GetPlayerSummaries([steamid])).players[0];
		const level = await api.GetSteamLevel(steamid);
		const badges = await api.GetBadges(steamid);
		const games = await api.GetOwnedGames(steamid);
		const recentGames = api.GetRecentlyPlayedGames(steamid);

		const achievements = await Promise.all(
			games.games.map(async game => {
				const playerAchievements = await api.GetPlayerAchievements(steamid, game.appid);
				const percents = (await api.GetGlobalAchievementPercentagesForApp(game.appid)).reduce(
					(prev, { name, percent }) => ({ ...prev, [name]: percent }),
					{} as { [key: string]: number }
				);
				return {
					...playerAchievements,
					achievements: playerAchievements.achievements.map(ach => {
						return { ...ach, percent: percents[ach.apiname] };
					})
				};
			})
		);

		const friendIds = (await api.GetFriendList(steamid)).map(friend => friend.steamid);
		const friends = await api.GetPlayerSummaries(friendIds);

		const json = {
			user,
			level,
			badges,
			friends,
			achievements,
			games,
			recentGames
		};

		core.setOutput('json', json);
	} catch (error) {
		// Fail the workflow run if an error occurs
		if (error instanceof Error) core.setFailed(error.message);
	}
}

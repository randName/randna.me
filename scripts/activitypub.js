import { WebFinger, ActivityPub, ActivityStreams } from '@musakui/fedi'

const actorContext = {
	'@context': [
		ActivityStreams.CONTEXT,
		'https://w3id.org/security/v1',
	],
}

export const create = (config) => {
	const {
		url,
		username,
		inboxPath,
		profilePath,
		publicKeyPem,
		publicKeyId = 'main-key',
		...cfg
	} = config

	const actor = {
		id: `${url}/${profilePath}`,
		type: 'Person',
		url,
		preferredUsername: username,
		manuallyApprovesFollowers: true,
	}

	const { hostname } = new URL(url)
	const subject = WebFinger.subject(username, hostname)
	const icon = cfg.profile?.icon
	const links = [
		WebFinger.link('self', ActivityPub.activityJSON, actor.id),
		WebFinger.link(WebFinger.PROFILE_PAGE, 'text/html', url),
		...(icon ? [
			WebFinger.link(WebFinger.AVATAR, icon.mediaType, icon.url),
		] : []),
	]

	return {
		[`${WebFinger.PATH}/${subject}`]: { subject, links },
		[profilePath]: {
			...actorContext,
			...actor,
			published: (new Date()).toISOString(),
			inbox: `${url}/${inboxPath}`,
			...cfg.profile,
			publicKey: {
				id: `${actor.id}#${publicKeyId}`,
				owner: actor.id,
				publicKeyPem,
			},
		},
	}
}

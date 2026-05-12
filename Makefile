dev:
	cd services/astro && pnpm dev

deploy:
	bash deploy.sh

deploy-test:
	bash deploy.sh --test

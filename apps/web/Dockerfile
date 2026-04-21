FROM node:20-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"

RUN corepack enable

WORKDIR /workspace

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN pnpm install --no-frozen-lockfile

COPY . .

RUN pnpm --filter @tk182/shared-types build && pnpm --filter @tk182/web build

WORKDIR /workspace/apps/web

EXPOSE 3000

CMD ["pnpm", "start"]

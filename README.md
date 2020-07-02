# Analyze Tools for OpenSphere

This is a wrapper project that contains modified `plugin.mist.MISTPlugin` and `toolsmain.js`
files (`toolsplugin.js` and `toolsmain.js`). The goal here is to produce a plugin that only
references the Analyze window, List Tool, Count By, and Charts. All other plugins/widgets
are excluded. This is the quick-and-dirty solution to getting the Analyze window into GV.

## Why not pull the code into a separate plugin?

Why not indeed? I will continue to argue for that, but for now this is what we get. The
counterpoint is that some developers dislike the idea of another repo to handle for
large features that span multiple repos. However, since we have invested in some
development to improve the process of PRs for single tickets across multiple repos, I
believe this to be doable.

It is probably _not_ doable if we have the source of record for the analyze/tools
plugin be on the low side without open sourcing it. That would mean that we would
have a github workflow (Open Sphere), a gitlab workflow (Analyze), and a high side
bitbucket workflow (MIST/others), which is definitely an unnecessary burden on
developers.

## Environment

Your workspace (or build job), must clone [MIST](https://gitlab.devops.geointservices.io/uncanny-cougar/mist)
to `mist/` (not `opensphere-plugin-mist`) and also clone
[bits-internal](https://gitlab.devops.geointservices.io/uncanny-cougar/bits-internal).

`npm-workspace install` will need to be run in both of those. For build jobs, linking
or using npm link should suffice to wire up those projects before running `npm install --production`.

## Security

Due to the fact that the `bits-internal` and `mist` projects are private code, any builds
running with this plugin should only run in an uncanny-cougar security context.

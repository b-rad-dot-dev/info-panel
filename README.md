# Configuring

1. Copy `config-template.json` and rename to `config.json` 
2. Create a `modules` directory
3. Clone various info-panel modules into the `modules` directory you just created

# Running

Run the docker image with the following configuration:

1. Mount the `config.json` file to `/app/config.json`
2. Mount your `modules` directory to `/app/modules/`

Optionally, bind to a different port on the host

# Development

The following are convenience scripts to get up and running locally:

* `dev.bat` - Starts up a node environment to do interactive development
  (so you don't need to install node locally)
* `build.bat` - Builds the latest version of the docker image
* `run.bat` - Runs the docker image against this repository (assumes there is a `config.json` file
  and `modules/` directory both at the root)
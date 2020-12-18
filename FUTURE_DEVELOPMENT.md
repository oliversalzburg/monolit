1. Launch multiple PLTs for a launch configuration. (Maybe nest concurrent jobs in tasks?)
2. Predefine alternative PLTs in workspace, then launch those with alternative command.
  complete
3. Restart command
  complete
4. Start more command
5. Dynamically adjust names of launch configs for better overview if multiple are running.
  not trivial
6. Support `${defaultBuildTask}`

The commands we should have:
1. Start : Execute launch config
  complete
2. Restart : Stop current sesseion, Execute same launch config without tasks
  complete
3. Clean Restart: Stop current session, Rebuild, Execute same launch config
  complete

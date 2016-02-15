Installation
------------

Requirements:

These are the environment variables, file and directory requirements. Go to setup and follow those
steps to setup your system.

    1. ENV['HOME'] directory
        a) this should already be set type: env to see your environment variables

    2. ENV['EDITOR'] or add to .slackrc.json as "editor". EX: "/usr/bin/vim"
        a) edit your shell's rc file - Ex: .bashrc
            export EDITOR="subl -w"
            ----- or ----
            export EDITOR="vim"

    3. $HOME/.reporting directory
        a) need to create

    4. $HOME/.slackrc.json file - has to be valid JSON
        a) need to create

    5. Sublime Editor
        a) Must use the -w (--wait) option with the editor (see above #1)
        b) If you don't want to change your EDITOR env value you can add it
           to your .slackrc.json file as "editor": "subl -w"

    6. TMUX Sessions
        a) If you use tmux and sublime (or atom) you need to reattach the editor
           process to the user. Do this:

            brew install reattach-to-user-namespace

Setup:

Go here, scroll to the bottom and create OAuth token:
https://api.slack.com/web

    $ cd
    $ mkdir .reporting
    $ vim .slackrc.json
      {
          "slack_token": "xxxx-DDDDDDDDDD-DDDDDDDDDDD-DDDDDDDDDDD-yyyyyyyyyy",
          "reporting": {
            "channel": "#general",
            "room_id": "",
            "members": {}
          }
      }
    $ cd /path/to/slack-reporting
    $ npm install
    $ node index.js -s "#channel" > ~/new-slackrc.json
    $ vim ~/new-slackrc.json  \[Note: change report to false for non-active members\]


Usage:

    $ node index.js



# raspi-mon
Raspberry Pi Monitor


## Install as a service (Raspian/Debian based)

Create a new file
```sh
sudo nano /etc/systemd/system/raspi-mon.service
```

Add the following to the new file
```sh
[Unit]
Description=raspi-mon
After=syslog.target network-online.target

[Service]
Type=simple
User=pi
#EnvironmentFile=/etc/default/raspi-mon
ExecStart=/home/pi/raspi-mon/bin/raspi-mon.js
Restart=always
RestartSec=5
KillMode=process

[Install]
WantedBy=multi-user.target
```

Type the following commands to enable and then start the service

1. `sudo systemctl daemon-reload`
2. `sudo systemctl enable camera.ui`
3. `sudo systemctl start camera.ui`


Afterwards you can watch the log with following command:

`sudo journalctl -f -u camera.ui`

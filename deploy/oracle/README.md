# Oracle Cloud Always Free — full VM (ARM Ampere up to 4 cores/24GB, or AMD micro), free forever.
# Runs the agent 24/7 with a systemd timer.

# 1. Create VM: https://cloud.oracle.com > Compute > Instances > Create
#    Image: Ubuntu 24.04 minimal (aarch64 Ampere = biggest free box).
#    Shape: VM.Standard.A1.Flex (4 OCPU / 24GB free) or VM.Standard.E2.1.Micro.
# 2. SSH in and run:
#
#    sudo apt update && sudo apt install -y nodejs npm git
#    git clone <your-blog-agent-repo> ~/blog-agent   # or scp the folder up
#    cd ~/blog-agent && cp .env.example .env && nano .env   # fill keys
#
# 3. Install the systemd units below:
#    sudo cp deploy/oracle/blog-agent.service /etc/systemd/system/
#    sudo cp deploy/oracle/blog-agent.timer /etc/systemd/system/
#    sudo systemctl daemon-reload
#    sudo systemctl enable --now blog-agent.timer
#
# 4. Verify: systemctl list-timers | grep blog; journalctl -u blog-agent -f

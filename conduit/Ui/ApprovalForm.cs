namespace Conduit.Ui;

/// <summary>
/// Asks the user whether a new device may control their League client.
/// </summary>
public class ApprovalForm : Form
{
    public ApprovalForm(string device, string browser)
    {
        Text = "Mimic - New connection";
        ClientSize = new Size(400, 160);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        TopMost = true;

        var message = new Label
        {
            Text = $"A device is trying to connect to Mimic:\n\n{device} ({browser})\n\nAllow it to control your League client?",
            Location = new Point(20, 15),
            Size = new Size(360, 90)
        };

        var allow = new Button { Text = "Allow", DialogResult = DialogResult.Yes, Location = new Point(200, 115), Size = new Size(85, 30) };
        var deny = new Button { Text = "Deny", DialogResult = DialogResult.No, Location = new Point(295, 115), Size = new Size(85, 30) };

        AcceptButton = allow;
        CancelButton = deny;
        Controls.AddRange([message, allow, deny]);
    }
}

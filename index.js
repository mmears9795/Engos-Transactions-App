import {Client, Intents, Collection, MessageEmbed, MessageAttachment, DiscordAPIError} from 'discord.js';
import require from 'dotenv/config';
import fetch from 'node-fetch';
import { promises as fs } from "fs";
import { get } from 'http';
import retry from 'async-retry';
const botToken = process.env.BOT_TOKEN;


const bot = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });



/* Ready */
bot.on("ready", () => {
    console.log("The bot is ready");



    bot.channels.fetch(process.env.CHANNEL_ID).then(channel => {




        // MAKE THE TRANSACTION MESSAGES

        var apiLink = "https://api.ethplorer.io/getTokenHistory/"+ process.env.CONTRACT_TOKEN +"?apiKey=" + process.env.ETHPLORER_API_KEY;
        var transactionsInterval = setInterval (function () {

            async function getDataToPost() {
                var data = await retry(
                    async (bail) => {
                        const response = await fetch(apiLink);

                        if (403 === response.status) {
                            bail(new Error('Unauthorized'));
                            return;
                        }

                        const data = await response.json();
                        return data;
                    },
                    {
                        retries: 5,
                        minTimeout: 5000,
                    }
                );
            
                // var ethPriceLink = "https://api.ethplorer.io/getTxInfo/" + data.transactionHash + "?apiKey=" + process.env.ETHPLORER_API_KEY;

                // ethPriceData = await retry(
                //     async(bail) => {
                //         const response = await fetch(ethPriceLink)

                //         if (403 === response.status) {
                //             bail(new Error('Unauthorized'));
                //             return;
                //         }

                //         const data = await response.json();

                //         console.log(data);

                //         return data;
                //     },
                //     {
                //         retries: 5,
                //         minTimeout: 5000,
                //     }
                // );

                async function readData(){
                    let dataX = fs.readFile('transactions.json', "utf8", function (err, data) {
                        return data;
                    });

                    return dataX;

                };

                var dataFromFile = await readData();

                dataFromFile = JSON.parse(dataFromFile);

                data.operations.forEach(async element => {
                    var elementData = {
                        timestamp : element.timestamp,
                        transactionHash : element.transactionHash,
                        transactionValue : element.value,
                        from : element.from,
                        to : element.to,
                        holders : element.tokenInfo.holdersCount,
                        value : element.value
                    }
                    

                    if(!dataFromFile.some(transaction => transaction.transactionHash === element.transactionHash && transaction.from === element.from && transaction.to === element.to)){
                        dataFromFile.push(elementData);                    

                        console.log(elementData);
                        console.log(".................");


                        function timeConverter(UNIX_timestamp){
                            var a = new Date(UNIX_timestamp * 1000);
                            var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                            var year = a.getFullYear();
                            var month = months[a.getMonth()];
                            var date = a.getDate();
                            var hour = a.getHours();
                            var min = a.getMinutes();
                            if (min < 10) {
                                min.toString();
                                min = "0" + min;
                            }
                            var sec = a.getSeconds();
                            if (sec < 10) {
                                sec.toString();
                                sec = "0" + sec;
                            }
                            var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
                            return time;
                          };


                        var gmt = timeConverter(element.timestamp);

                        var transactionFrom = element.from;
                        var transactionTo = element.to;

                        // Color Green - #8cd96b
                        // Color Red - #ff5959

                        // Green Arrow Link - https://i.imgur.com/LG7KB5D.png
                        // Red Arrow Link - https://i.imgur.com/weeLdZc.png

                        if(element.from == process.env.CONTRACT_TOKEN && element.to == process.env.UNISWAP_ADDRESS) {
                            var transfer = true;
                        } else if(element.from == process.env.UNISWAP_ADDRESS){
                            var transfer = false;
                            var buy = true;
                            var messageColor = "#8cd96b";
                            var arrowColor = "https://i.imgur.com/LG7KB5D.png";
                            transactionFrom = "Uniswap ENGOS Pool";
                        } else if (element.to == process.env.UNISWAP_ADDRESS){
                            var transfer = false;
                            var buy = false;
                            var messageColor = "#ff5959";
                            var arrowColor = "https://i.imgur.com/weeLdZc.png";
                            transactionTo = "Uniswap ENGOS Pool";
                        } else {
                            var transfer = true;
                        }

                        // Calculate Quantity

                        var tokenQuantity = element.value.toString();
                        tokenQuantity = tokenQuantity.slice(0, -9);
                        tokenQuantity = tokenQuantity.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

                        // SEND THE DISCORD MESSAGE

                        if (transfer == false) {
                        const attachment = new MessageAttachment('./logo.png');
                        const messageToBeSent = new MessageEmbed()
                        .setColor(messageColor)
                        .setTitle('Check Transaction on EtherScan.io!')
                        .setURL('https://etherscan.io/tx/' + element.transactionHash)
                        .setAuthor('www.engos.com', 'attachment://logo.png', 'https://engos.com/')
                        .setThumbnail(arrowColor)
                        .addField('Token Quantity', tokenQuantity)
                        .addField('From', transactionFrom)
                        .addField('To', transactionTo)
                        .addField('GMT Timestamp', gmt)
                        .addField('Check out more information on Dextools.io!', "[Dextools](https://www.dextools.io/app/ether/pair-explorer/0x4b05af0cec31c2b536556db22f3c1735dfbedad1)")
                        .setFooter('Engos', 'attachment://logo.png');

                        channel.send({ embeds: [messageToBeSent] , files: [attachment]} );
                        }
                    };


                });

                fs.writeFile("transactions.json", JSON.stringify(dataFromFile), function(err){
                    if (err) {throw err};
                    console.log('The "data to append" was appended to file!');
                });
                
            };
        
            try {
                getDataToPost();
            } catch (err) {
                console.log("Transaction error: ", err);
            }

        }, process.env.SECONDS * 1000); 
    });
});

bot.login(botToken);

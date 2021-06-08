const puppeteer = require('puppeteer');
const user = require('./auth/auth');
const path = require('path')
const fs = require('fs');
const fsExtra = require('fs-extra');
const moment = require('moment');

// see: https://www.npmjs.com/package/pdf-to-printer

async function robo() {
    console.log("Iniciando Robo CEABS v0.1");

    const browser = await puppeteer.launch({
        //headless: false
    });
    const page = await browser.newPage();
    const client = await page.target().createCDPSession();

    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: path.resolve(__dirname, './pdf')
    });


    page.setViewport({
        width: 1366,
        height: 850
    });

    await page.goto('https://core.ceabs.com.br/CEABS_Common/Login.aspx?OriginalURL=%2fCEABS_App%2fHome.aspx');


    const selectorUsername = '#OutSystemsUIWeb_wt27_block_wtLogin_OutSystemsUIWeb_wt21_block_wtLogin_OutSystemsUIWeb_wt33_block_wtInput_wtUserNameInput';
    const selectorPassord = '#OutSystemsUIWeb_wt27_block_wtLogin_OutSystemsUIWeb_wt21_block_wtLogin_OutSystemsUIWeb_wt36_block_wtInput_wtPasswordInput';
    const submitButton = '#OutSystemsUIWeb_wt27_block_wtLogin_OutSystemsUIWeb_wt21_block_wtLogin_wtLoginButton';

    await page.type(selectorUsername, user.username);
    await page.type(selectorPassord, user.password);
    await page.click(submitButton);

    await page.waitForSelector('#DublinTheme_wt23_block_wtHeader_CEABS_Common_wt38_block_DublinTheme_wt1_block_wtHeader_loginInfo_wt16_wtLoginInfo_username2').then(async() => {
        
        console.log("Login efetuado com sucesso");
        await page.goto('https://core.ceabs.com.br/CEABS_FieldService/WorkOrdersAdvanced.aspx');
        await filter();

    });
    

    async function filter(){
        const inputDateStart = '#DublinTheme_wt141_block_wtMainContent_WebPatterns_wtFiltersContainer_block_wtContent_WebPatterns_wtFiltros_block_wtColumn2_wtSchedulingPeriodStartContainer';
        const inputDateEnd = '#DublinTheme_wt141_block_wtMainContent_WebPatterns_wtFiltersContainer_block_wtContent_WebPatterns_wtFiltros_block_wtColumn2_wtSchedulingPeriodEndContainer';
        const findButton = '#DublinTheme_wt141_block_wtMainContent_WebPatterns_wtFiltersContainer_block_wtContent_wt52';
        const currentDate = moment().add(1, 'day').format('DD/MM/YYYY');

        await page.waitForSelector(inputDateStart).then(async () => {
            await page.click(inputDateStart);
            await page.keyboard.type(currentDate);

            await page.click(inputDateEnd);
            await page.keyboard.type(currentDate);
            

            await page.click(findButton);

            console.log("Buscando OS para o dia: ", currentDate);

            getAllandPrint();
        })
    }

    async function getAllandPrint() {


        await page.waitForSelector('.TableRecords_OddLine input', {
            visible: true,
            timeout: 0
        }).then(async () => {
            
            const count = await page.evaluate(() => document.querySelector('.Counter_Message').innerHTML.replace('&nbsp;', ' '));
            console.log('Encontramos: '+count);

            const selectAll = '#DublinTheme_wt141_block_wtMainContent_wtWorkOrderTable_ctl02_RichWidgets_wt75_block_wtchkSelectAll';
            await page.waitForTimeout(1000).then(async () => {
                await page.click(selectAll);
                printButton();
            })
        })
    }

    async function printButton() {

        console.log("Gerando PDF das OS para impressão...");

        const printLink = "#DublinTheme_wt141_block_wtMainContent_wtlinkPrint3";
        await page.click(printLink);

        await page.waitForTimeout(1000).then(async () => {
            await getFilesFromFolder();
        })


        return false;
    }

    async function getFilesFromFolder() {
        let timer = setInterval(function() {
            
            fs.readdir(path.resolve(__dirname, './pdf'), async (err, files) => {
                if (err){
                    console.log(err);
                    clearInterval(timer);
                } else {
                    
                    
                    if(files.length > 0){
                        console.log("Arquivo encontrado...");
                        clearInterval(timer);

                        files.forEach(file => {
                            console.log('imprimir: ' + file);
                        })

                        await page.waitForTimeout(5000).then(async () => {
                            console.log("Limpando Diretório");
                            fsExtra.emptyDirSync(path.resolve(__dirname, './pdf'));
                            console.log("Robo CEABS Finalizado");
                            await page.waitForTimeout(5000).then(async () => {
                                await browser.close();
                            })
                        })

                       
                    }else {
                        console.log('AGUARDE...');
                    }
                }
            })
        }, 1000 );

        
    }
}

robo();

import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

test('comparison chart renders real proportional bars and stays visible while loading or without prices', async () => {
  const server=await createServer({root:new URL('../',import.meta.url).pathname,configFile:false,plugins:[react()],optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,ws:false,watch:null}});
  try {
    const {default:Chart}=await server.ssrLoadModule('/src/components/ComparisonTuitionChart.jsx');
    const tuition={amount:4500000,currency:'COP',basis:'NEW_STUDENT_REPORTED',source:'https://hecaa.mineducacion.gov.co/consultaspublicas/programas',sourceField:'COSTO_MATRÍCULA_ESTUD_NUEVOS',importedAt:'2026-10-14'};
    const p={id:'1',name:'Derecho',institution:'Universidad',city:'Bogotá',provenance:'real',comparisonState:'current',tuition};
    const render=(programs,loading=false)=>renderToStaticMarkup(createElement(MemoryRouter,null,createElement(Chart,{programs,loading})));
    const html=render([p,{...p,id:'2',tuition:{...tuition,amount:9000000}}]);
    assert.match(html,/width:50%/);assert.match(html,/width:100%/);
    assert.match(html,/Comparación de precios de matrícula/);
    const missing=render([{...p,tuition:undefined}]);
    assert.match(missing,/tuition-track-unavailable/);assert.match(missing,/Precio por confirmar/);assert.doesNotMatch(missing,/class="tuition-bar"/);
    const loading=render([{...p,comparisonState:'loading'}],true);
    assert.match(loading,/tuition-chart/);assert.match(loading,/Consultando precio/);assert.doesNotMatch(loading,/class="tuition-bar"/);
  } finally {await server.close();}
});

# Elastic IP Configuration

## IP Fixa Assignada
- **IP**: 13.37.29.28
- **Allocation ID**: eipalloc-0029297aa824fde94
- **Association ID**: eipassoc-079eb453d613607f3
- **Instància EC2**: i-0a5a4ae14e0969024

## Configuració DNS Necessària
Per que funcioni correctament, assegura't que tens aquests registres DNS a IONOS:

```
Tipus: A
Nom: api
Valor: 13.37.29.28
TTL: 3600 (o el mínim permès)
```

## Avantatges de l'Elastic IP
1. **IP Fixa**: La IP no canvia mai, fins i tot si pares/engegues la instància
2. **Gratuïta**: Mentre estigui assignada a una instància en funcionament
3. **Portabilitat**: Pots reassignar-la a altres instàncies si cal

## Important
⚠️ **Cost**: Si l'Elastic IP no està assignada a cap instància, AWS cobra $0.005/hora
💡 **Solució**: Sempre mantén-la assignada a la instància o allibera-la si no la necessites

## Comandos útils

### Verificar estat
```bash
aws ec2 describe-addresses --allocation-ids eipalloc-0029297aa824fde94
```

### Desassignar (si cal)
```bash
aws ec2 disassociate-address --association-id eipassoc-079eb453d613607f3
```

### Reassignar a la mateixa instància
```bash
aws ec2 associate-address --instance-id i-0a5a4ae14e0969024 --allocation-id eipalloc-0029297aa824fde94
```

### Alliberar l'Elastic IP (eliminar-la completament)
```bash
aws ec2 release-address --allocation-id eipalloc-0029297aa824fde94
```

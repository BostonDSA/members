REPO    := boston-dsa/members
RUNTIME := nodejs12.x

.PHONY: plan apply clean clobber

plan: .terraform/terraform.zip

apply: .terraform/terraform.zip
	terraform apply $<

clean:
	rm -rf .terraform/terraform.zip

clobber:
	docker image ls $(REPO) --quiet | uniq | xargs docker image rm --force

.terraform:
	mkdir -p $@
	terraform init

.terraform/terraform.zip: package.zip | .terraform
	terraform plan -out $@

package-lock.json package.zip: package.zip.iid
	docker run --rm --entrypoint cat $$(cat $<) $@ > $@

package.zip.iid: *.js package.json
	docker build --build-arg RUNTIME=$(RUNTIME) --iidfile $@ --tag $(REPO) .

zoom-local:
	lambda-local --lambda-path zoom_meeting_fetcher.js --event-path event.json --envfile .env --timeout 300
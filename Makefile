name    := members
runtime := nodejs8.10
build   := $(shell git describe --tags --always)

.PHONY: all apply clean

all: package-lock.json package.zip

.docker:
	mkdir -p $@

.docker/%: package.json | .docker
	docker build \
	--build-arg RUNTIME=$(runtime) \
	--build-arg AWS_ACCESS_KEY_ID \
	--build-arg AWS_DEFAULT_REGION \
	--build-arg AWS_SECRET_ACCESS_KEY \
	--build-arg TF_VAR_release=$* \
	--iidfile $@ \
	--tag boston-dsa/$(name):$* .

package-lock.json: .docker/$(build)
	docker run --rm $(shell cat $<) cat /var/task/$@ > $@

package.zip: .docker/$(build)
	docker run --rm $(shell cat $<) cat /var/task/$@ > $@

apply: .docker/$(build)
	docker run --rm $(shell cat $<)

clean:
	-docker image rm -f $(shell sed G .docker/*)
	-rm -rf .docker *.zip
